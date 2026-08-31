import {
  Controller,
  Get,
  Injectable,
  Req,
} from '@nestjs/common';

// ============================================================
// TYPES
// ============================================================

export interface DailyActiveUser {
  id: string;
  userId: string;

  /*
   * Calendar date represented as YYYY-MM-DD.
   *
   * This is intentionally separate from createdAt so that
   * DAU calculations are based on a calendar day rather than
   * arbitrary 24-hour windows.
   */
  activityDate: string;

  createdAt: Date;
}

// ============================================================
// REPOSITORY
// ============================================================

export interface DailyActiveUserRepository {

  findByUserAndDate(
    userId: string,
    activityDate: string,
  ): Promise<DailyActiveUser | null>;

  create(
    activity: DailyActiveUser,
  ): Promise<DailyActiveUser>;

  countByDate(
    activityDate: string,
  ): Promise<number>;

  countByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<number>;

  findByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<DailyActiveUser[]>;
}

// ============================================================
// IN-MEMORY REPOSITORY
// ============================================================

@Injectable()
export class InMemoryDailyActiveUserRepository
  implements DailyActiveUserRepository {

  private readonly records =
    new Map<string, DailyActiveUser>();

  // ----------------------------------------------------------
  // FIND USER ACTIVITY FOR A DAY
  // ----------------------------------------------------------

  async findByUserAndDate(
    userId: string,
    activityDate: string,
  ): Promise<DailyActiveUser | null> {

    const key =
      `${userId}:${activityDate}`;

    return this.records.get(key) ?? null;
  }

  // ----------------------------------------------------------
  // CREATE ACTIVITY RECORD
  // ----------------------------------------------------------

  async create(
    activity: DailyActiveUser,
  ): Promise<DailyActiveUser> {

    const key =
      `${activity.userId}:${activity.activityDate}`;

    /*
     * The application should also enforce this constraint
     * at the database level.
     */

    if (this.records.has(key)) {
      return this.records.get(key)!;
    }

    this.records.set(
      key,
      activity,
    );

    return activity;
  }

  // ----------------------------------------------------------
  // COUNT A SINGLE DAY
  // ----------------------------------------------------------

  async countByDate(
    activityDate: string,
  ): Promise<number> {

    let count = 0;

    for (
      const record of this.records.values()
    ) {

      if (
        record.activityDate ===
        activityDate
      ) {
        count++;
      }
    }

    return count;
  }

  // ----------------------------------------------------------
  // COUNT DATE RANGE
  // ----------------------------------------------------------

  async countByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<number> {

    let count = 0;

    for (
      const record of this.records.values()
    ) {

      if (
        record.activityDate >= startDate &&
        record.activityDate <= endDate
      ) {
        count++;
      }
    }

    return count;
  }

  // ----------------------------------------------------------
  // FIND DATE RANGE
  // ----------------------------------------------------------

  async findByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<DailyActiveUser[]> {

    return Array.from(
      this.records.values(),
    ).filter(
      (record) =>
        record.activityDate >= startDate &&
        record.activityDate <= endDate,
    );
  }
}

// ============================================================
// DAILY ACTIVE USER SERVICE
// ============================================================

@Injectable()
export class DailyActiveUserService {

  constructor(
    private readonly repository:
      DailyActiveUserRepository,
  ) {}

  // ==========================================================
  // RECORD USER ACTIVITY
  // ==========================================================

  async track(
    userId: string,
    date: Date = new Date(),
  ): Promise<DailyActiveUser> {

    // --------------------------------------------------------
    // VALIDATE USER ID
    // --------------------------------------------------------

    if (
      !userId ||
      userId.trim().length === 0
    ) {

      throw new Error(
        'userId is required',
      );
    }

    // --------------------------------------------------------
    // CONVERT TO CALENDAR DATE
    // --------------------------------------------------------

    const activityDate =
      this.toActivityDate(date);

    // --------------------------------------------------------
    // IDEMPOTENCY CHECK
    // --------------------------------------------------------

    /*
     * A user should only count once per day.
     *
     * This means that:
     *
     *   1 request
     *
     * and:
     *
     *   100 requests
     *
     * on the same day both produce exactly one DAU record.
     */

    const existing =
      await this.repository
        .findByUserAndDate(
          userId,
          activityDate,
        );

    if (existing) {
      return existing;
    }

    // --------------------------------------------------------
    // CREATE DAILY ACTIVITY
    // --------------------------------------------------------

    const activity: DailyActiveUser = {
      id:
        this.generateId(),

      userId,

      activityDate,

      createdAt:
        new Date(),
    };

    /*
     * The database must have a unique constraint on:
     *
     *   (userId, activityDate)
     *
     * so concurrent requests cannot create duplicate DAU
     * records.
     */

    return this.repository.create(
      activity,
    );
  }

  // ==========================================================
  // GET TODAY'S DAU
  // ==========================================================

  async getToday(
    date: Date = new Date(),
  ): Promise<number> {

    const today =
      this.toActivityDate(date);

    return this.repository
      .countByDate(today);
  }

  // ==========================================================
  // GET DAU FOR SPECIFIC DATE
  // ==========================================================

  async getForDate(
    date: Date,
  ): Promise<number> {

    const activityDate =
      this.toActivityDate(date);

    return this.repository
      .countByDate(activityDate);
  }

  // ==========================================================
  // GET DAU FOR DATE RANGE
  // ==========================================================

  async getForDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {

    const start =
      this.toActivityDate(
        startDate,
      );

    const end =
      this.toActivityDate(
        endDate,
      );

    if (start > end) {
      throw new Error(
        'startDate must be before endDate',
      );
    }

    return this.repository
      .countByDateRange(
        start,
        end,
      );
  }

  // ==========================================================
  // GET DAILY BREAKDOWN
  // ==========================================================

  async getDailyBreakdown(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      date: string;
      activeUsers: number;
    }>
  > {

    const start =
      this.toActivityDate(
        startDate,
      );

    const end =
      this.toActivityDate(
        endDate,
      );

    if (start > end) {
      throw new Error(
        'startDate must be before endDate',
      );
    }

    const records =
      await this.repository
        .findByDateRange(
          start,
          end,
        );

    const counts =
      new Map<string, number>();

    // --------------------------------------------------------
    // INITIALIZE DATES
    // --------------------------------------------------------

    let current =
      new Date(
        `${start}T00:00:00.000Z`,
      );

    const finalDate =
      new Date(
        `${end}T00:00:00.000Z`,
      );

    while (
      current <= finalDate
    ) {

      const date =
        current
          .toISOString()
          .slice(0, 10);

      counts.set(
        date,
        0,
      );

      current.setUTCDate(
        current.getUTCDate() + 1,
      );
    }

    // --------------------------------------------------------
    // COUNT RECORDS
    // --------------------------------------------------------

    for (
      const record of records
    ) {

      counts.set(
        record.activityDate,
        (
          counts.get(
            record.activityDate,
          ) ?? 0
        ) + 1,
      );
    }

    // --------------------------------------------------------
    // RETURN SORTED RESULTS
    // --------------------------------------------------------

    return Array.from(
      counts.entries(),
    ).map(
      ([
        date,
        activeUsers,
      ]) => ({
        date,
        activeUsers,
      }),
    );
  }

  // ==========================================================
  // DATE NORMALIZATION
  // ==========================================================

  private toActivityDate(
    date: Date,
  ): string {

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {

      throw new Error(
        'Invalid date',
      );
    }

    /*
     * Use UTC consistently.
     *
     * If the product defines "day" according to a specific
     * business timezone, replace this with timezone-aware
     * conversion and use the same timezone everywhere.
     */

    return date
      .toISOString()
      .slice(0, 10);
  }

  // ==========================================================
  // ID GENERATION
  // ==========================================================

  private generateId(): string {

    return [
      'dau',
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2),
    ].join('_');
  }
}

// ============================================================
// ACTIVITY TRACKING MIDDLEWARE / HOOK
// ============================================================

@Injectable()
export class ActivityTrackingService {

  constructor(
    private readonly dailyActiveUsers:
      DailyActiveUserService,
  ) {}

  // ==========================================================
  // TRACK AUTHENTICATED USER
  // ==========================================================

  async onAuthenticatedRequest(
    userId: string,
  ): Promise<void> {

    /*
     * This method should be called after authentication has
     * successfully identified the current user.
     *
     * Do not count anonymous traffic as DAU unless the
     * application has a separate anonymous-user metric.
     */

    await this.dailyActiveUsers.track(
      userId,
    );
  }
}

// ============================================================
// CONTROLLER
// ============================================================

@Controller('analytics')
export class DailyActiveUserController {

  constructor(
    private readonly service:
      DailyActiveUserService,
  ) {}

  // ==========================================================
  // TODAY'S ACTIVE USERS
  // ==========================================================

  @Get('dau/today')
  async today() {

    const activeUsers =
      await this.service.getToday();

    return {
      date:
        new Date()
          .toISOString()
          .slice(0, 10),

      activeUsers,
    };
  }

  // ==========================================================
  // DAILY BREAKDOWN
  // ==========================================================

  @Get('dau')
  async daily() {

    const end =
      new Date();

    const start =
      new Date();

    /*
     * Default to the previous 30 days.
     */

    start.setUTCDate(
      start.getUTCDate() - 29,
    );

    return this.service
      .getDailyBreakdown(
        start,
        end,
      );
  }
}

// ============================================================
// PRISMA SCHEMA
// ============================================================

/*
 * If the application uses Prisma, add a model similar to:
 *
 *
 * model DailyActiveUser {
 *   id           String   @id @default(cuid())
 *   userId       String
 *   activityDate DateTime @db.Date
 *   createdAt    DateTime @default(now())
 *
 *   user User @relation(
 *     fields: [userId],
 *     references: [id],
 *     onDelete: Cascade
 *   )
 *
 *   @@unique([userId, activityDate])
 *   @@index([activityDate])
 *   @@index([userId])
 * }
 *
 *
 * The important part is:
 *
 *   @@unique([userId, activityDate])
 *
 * This guarantees that one user cannot be counted more than
 * once for the same calendar day.
 */

// ============================================================
// SQL MIGRATION
// ============================================================

/*
 *
 * CREATE TABLE daily_active_users (
 *
 *   id UUID PRIMARY KEY,
 *
 *   user_id UUID NOT NULL,
 *
 *   activity_date DATE NOT NULL,
 *
 *   created_at TIMESTAMPTZ NOT NULL
 *     DEFAULT CURRENT_TIMESTAMP,
 *
 *   CONSTRAINT daily_active_users_user_date_unique
 *     UNIQUE (
 *       user_id,
 *       activity_date
 *     )
 * );
 *
 *
 * CREATE INDEX
 * daily_active_users_activity_date_idx
 * ON daily_active_users(activity_date);
 *
 *
 * CREATE INDEX
 * daily_active_users_user_id_idx
 * ON daily_active_users(user_id);
 *
 */

// ============================================================
// SQL DAU QUERY
// ============================================================

/*
 *
 * Today's DAU:
 *
 *
 * SELECT COUNT(DISTINCT user_id)
 * FROM daily_active_users
 * WHERE activity_date = CURRENT_DATE;
 *
 *
 *
 * DAU for a date:
 *
 *
 * SELECT COUNT(DISTINCT user_id)
 * FROM daily_active_users
 * WHERE activity_date = $1;
 *
 *
 *
 * Daily DAU breakdown:
 *
 *
 * SELECT
 *   activity_date,
 *   COUNT(DISTINCT user_id) AS active_users
 *
 * FROM daily_active_users
 *
 * WHERE activity_date
 *   BETWEEN $1 AND $2
 *
 * GROUP BY activity_date
 *
 * ORDER BY activity_date ASC;
 *
 */

// ============================================================
// PRISMA REPOSITORY EXAMPLE
// ============================================================

/*
 *
 * @Injectable()
 * export class PrismaDailyActiveUserRepository
 *   implements DailyActiveUserRepository {
 *
 *   constructor(
 *     private readonly prisma: PrismaService,
 *   ) {}
 *
 *   async findByUserAndDate(
 *     userId: string,
 *     activityDate: string,
 *   ) {
 *
 *     return this.prisma.dailyActiveUser.findUnique({
 *       where: {
 *         userId_activityDate: {
 *           userId,
 *           activityDate:
 *             new Date(
 *               `${activityDate}T00:00:00.000Z`,
 *             ),
 *         },
 *       },
 *     });
 *   }
 *
 *   async create(activity) {
 *
 *     return this.prisma.dailyActiveUser.create({
 *       data: {
 *         userId:
 *           activity.userId,
 *
 *         activityDate:
 *           new Date(
 *             `${activity.activityDate}T00:00:00.000Z`,
 *           ),
 *       },
 *     });
 *   }
 *
 *   async countByDate(activityDate: string) {
 *
 *     return this.prisma.dailyActiveUser.count({
 *       where: {
 *         activityDate:
 *           new Date(
 *             `${activityDate}T00:00:00.000Z`,
 *           ),
 *       },
 *     });
 *   }
 * }
 *
 */

// ============================================================
// AUTHENTICATION INTEGRATION
// ============================================================

/*
 * DAU tracking should happen AFTER authentication.
 *
 * Example:
 *
 *
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * async profile(@Req() req) {
 *
 *   await this.activityTrackingService
 *     .onAuthenticatedRequest(
 *       req.user.id,
 *     );
 *
 *   return this.usersService
 *     .getProfile(req.user.id);
 * }
 *
 *
 * In a larger application, it is better to put this into a
 * global authenticated-request interceptor/middleware rather
 * than manually adding it to every controller.
 */

// ============================================================
// INTERCEPTOR EXAMPLE
// ============================================================

/*
 *
 * @Injectable()
 * export class DailyActiveUserInterceptor
 *   implements NestInterceptor {
 *
 *   constructor(
 *     private readonly activityTrackingService:
 *       ActivityTrackingService,
 *   ) {}
 *
 *   async intercept(
 *     context: ExecutionContext,
 *     next: CallHandler,
 *   ) {
 *
 *     const request =
 *       context
 *         .switchToHttp()
 *         .getRequest();
 *
 *     const user =
 *       request.user;
 *
 *     if (user?.id) {
 *
 *       await this.activityTrackingService
 *         .onAuthenticatedRequest(
 *           user.id,
 *         );
 *     }
 *
 *     return next.handle();
 *   }
 *
 * }
 *
 */

// ============================================================
// UNIT TESTS
// ============================================================

describe(
  'DailyActiveUserService',
  () => {

    let service:
      DailyActiveUserService;

    let repository:
      InMemoryDailyActiveUserRepository;

    beforeEach(
      () => {

        repository =
          new InMemoryDailyActiveUserRepository();

        service =
          new DailyActiveUserService(
            repository,
          );
      },
    );

    // ========================================================
    // FIRST ACTIVITY
    // ========================================================

    it(
      'creates an activity record for a user',
      async () => {

        const result =
          await service.track(
            'user-1',
            new Date(
              '2026-08-31T08:00:00.000Z',
            ),
          );

        expect(
          result.userId,
        ).toBe(
          'user-1',
        );

        expect(
          result.activityDate,
        ).toBe(
          '2026-08-31',
        );
      },
    );

    // ========================================================
    // IDEMPOTENCY
    // ========================================================

    it(
      'counts a user only once per day',
      async () => {

        const first =
          await service.track(
            'user-1',
            new Date(
              '2026-08-31T08:00:00.000Z',
            ),
          );

        const second =
          await service.track(
            'user-1',
            new Date(
              '2026-08-31T20:00:00.000Z',
            ),
          );

        expect(
          second.id,
        ).toBe(
          first.id,
        );

        const dau =
          await service.getForDate(
            new Date(
              '2026-08-31T23:00:00.000Z',
            ),
          );

        expect(
          dau,
        ).toBe(
          1,
        );
      },
    );

    // ========================================================
    // MULTIPLE USERS
    // ========================================================

    it(
      'counts multiple users independently',
      async () => {

        const date =
          new Date(
            '2026-08-31T12:00:00.000Z',
          );

        await service.track(
          'user-1',
          date,
        );

        await service.track(
          'user-2',
          date,
        );

        await service.track(
          'user-3',
          date,
        );

        expect(
          await service.getForDate(
            date,
          ),
        ).toBe(
          3,
        );
      },
    );

    // ========================================================
    // DIFFERENT DAYS
    // ========================================================

    it(
      'tracks the same user on different days',
      async () => {

        await service.track(
          'user-1',
          new Date(
            '2026-08-30T12:00:00.000Z',
          ),
        );

        await service.track(
          'user-1',
          new Date(
            '2026-08-31T12:00:00.000Z',
          ),
        );

        expect(
          await service.getForDate(
            new Date(
              '2026-08-30T12:00:00.000Z',
            ),
          ),
        ).toBe(
          1,
        );

        expect(
          await service.getForDate(
            new Date(
              '2026-08-31T12:00:00.000Z',
            ),
          ),
        ).toBe(
          1,
        );
      },
    );

    // ========================================================
    // DAILY BREAKDOWN
    // ========================================================

    it(
      'returns a daily DAU breakdown',
      async () => {

        await service.track(
          'user-1',
          new Date(
            '2026-08-29T10:00:00.000Z',
          ),
        );

        await service.track(
          'user-2',
          new Date(
            '2026-08-29T12:00:00.000Z',
          ),
        );

        await service.track(
          'user-1',
          new Date(
            '2026-08-30T10:00:00.000Z',
          ),
        );

        const result =
          await service.getDailyBreakdown(
            new Date(
              '2026-08-29T00:00:00.000Z',
            ),
            new Date(
              '2026-08-31T00:00:00.000Z',
            ),
          );

        expect(
          result,
        ).toEqual([
          {
            date: '2026-08-29',
            activeUsers: 2,
          },
          {
            date: '2026-08-30',
            activeUsers: 1,
          },
          {
            date: '2026-08-31',
            activeUsers: 0,
          },
        ]);
      },
    );

    // ========================================================
    // INVALID USER
    // ========================================================

    it(
      'rejects an empty user ID',
      async () => {

        await expect(
          service.track(
            '',
          ),
        ).rejects.toThrow(
          'userId is required',
        );
      },
    );

    // ========================================================
    // INVALID DATE RANGE
    // ========================================================

    it(
      'rejects an invalid date range',
      async () => {

        await expect(
          service.getForDateRange(
            new Date(
              '2026-08-31',
            ),
            new Date(
              '2026-08-01',
            ),
          ),
        ).rejects.toThrow(
          'startDate must be before endDate',
        );
      },
    );
  },
);

// ============================================================
// IMPORTANT PRODUCT DECISION
// ============================================================

/*
 *
 * WHAT COUNTS AS "ACTIVE"?
 *
 * This implementation treats an authenticated user making a
 * qualifying application request as active.
 *
 * It does NOT count:
 *
 *   - anonymous visitors
 *   - failed authentication attempts
 *   - health checks
 *   - automated background jobs
 *   - internal service-to-service requests
 *
 *
 * Recommended qualifying events:
 *
 *   - successful login
 *   - authenticated API request
 *   - meaningful application interaction
 *
 *
 * For high-traffic applications, tracking every request is
 * unnecessary. Because the database has a unique
 * (userId, activityDate) constraint, only the first activity
 * of the day needs to create a record.
 *
 */

// ============================================================
// END
// ============================================================
