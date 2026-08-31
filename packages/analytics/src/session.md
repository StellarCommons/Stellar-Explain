import {
  Body,
  Controller,
  Get,
  Injectable,
  Post,
  Req,
} from '@nestjs/common';

// ============================================================
// TYPES
// ============================================================

export interface PageDepthEvent {
  id: string;

  userId?: string;

  sessionId: string;

  /*
   * URL or logical route visited by the user.
   *
   * Examples:
   *
   * /dashboard
   * /reports
   * /reports/123
   * /reports/123/details
   */
  page: string;

  /*
   * Depth of the current page in the navigation journey.
   *
   * Example:
   *
   * dashboard       -> 1
   * reports         -> 2
   * report details  -> 3
   * audit details   -> 4
   */
  depth: number;

  /*
   * Position of the page within the current session.
   */
  sequence: number;

  timestamp: Date;
}

// ============================================================
// DTO
// ============================================================

export class TrackPageDepthDto {
  sessionId!: string;

  page!: string;

  depth!: number;

  sequence?: number;
}

// ============================================================
// SESSION DEPTH
// ============================================================

export interface SessionDepth {
  sessionId: string;

  userId?: string;

  maxDepth: number;

  pagesVisited: number;

  uniquePages: number;

  startedAt: Date;

  lastActivityAt: Date;
}

// ============================================================
// REPOSITORY
// ============================================================

export interface PageDepthRepository {

  create(
    event: PageDepthEvent,
  ): Promise<PageDepthEvent>;

  findBySession(
    sessionId: string,
  ): Promise<PageDepthEvent[]>;

  findByUser(
    userId: string,
  ): Promise<PageDepthEvent[]>;

  countByDepth(
    depth: number,
  ): Promise<number>;

  findAll(): Promise<PageDepthEvent[]>;
}

// ============================================================
// IN-MEMORY REPOSITORY
// ============================================================

@Injectable()
export class InMemoryPageDepthRepository
  implements PageDepthRepository {

  private readonly events:
    PageDepthEvent[] = [];

  // ----------------------------------------------------------
  // CREATE
  // ----------------------------------------------------------

  async create(
    event: PageDepthEvent,
  ): Promise<PageDepthEvent> {

    this.events.push(
      event,
    );

    return event;
  }

  // ----------------------------------------------------------
  // FIND SESSION EVENTS
  // ----------------------------------------------------------

  async findBySession(
    sessionId: string,
  ): Promise<PageDepthEvent[]> {

    return this.events.filter(
      event =>
        event.sessionId ===
        sessionId,
    );
  }

  // ----------------------------------------------------------
  // FIND USER EVENTS
  // ----------------------------------------------------------

  async findByUser(
    userId: string,
  ): Promise<PageDepthEvent[]> {

    return this.events.filter(
      event =>
        event.userId ===
        userId,
    );
  }

  // ----------------------------------------------------------
  // COUNT DEPTH
  // ----------------------------------------------------------

  async countByDepth(
    depth: number,
  ): Promise<number> {

    return this.events.filter(
      event =>
        event.depth ===
        depth,
    ).length;
  }

  // ----------------------------------------------------------
  // FIND ALL
  // ----------------------------------------------------------

  async findAll(): Promise<PageDepthEvent[]> {

    return [
      ...this.events,
    ];
  }
}

// ============================================================
// PAGE DEPTH SERVICE
// ============================================================

@Injectable()
export class PageDepthService {

  constructor(
    private readonly repository:
      PageDepthRepository,
  ) {}

  // ==========================================================
  // TRACK PAGE VISIT
  // ==========================================================

  async track(
    userId: string | undefined,
    dto: TrackPageDepthDto,
  ): Promise<PageDepthEvent> {

    // --------------------------------------------------------
    // VALIDATE SESSION
    // --------------------------------------------------------

    if (
      !dto.sessionId ||
      dto.sessionId.trim().length === 0
    ) {

      throw new Error(
        'sessionId is required',
      );
    }

    // --------------------------------------------------------
    // VALIDATE PAGE
    // --------------------------------------------------------

    if (
      !dto.page ||
      dto.page.trim().length === 0
    ) {

      throw new Error(
        'page is required',
      );
    }

    // --------------------------------------------------------
    // VALIDATE DEPTH
    // --------------------------------------------------------

    if (
      !Number.isInteger(
        dto.depth,
      ) ||
      dto.depth < 1
    ) {

      throw new Error(
        'depth must be a positive integer',
      );
    }

    // --------------------------------------------------------
    // VALIDATE MAXIMUM DEPTH
    // --------------------------------------------------------

    /*
     * A reasonable upper bound prevents malformed clients
     * from sending meaningless values such as:
     *
     * depth = 999999999
     */

    if (
      dto.depth > 1000
    ) {

      throw new Error(
        'depth exceeds the maximum allowed value',
      );
    }

    // --------------------------------------------------------
    // GET SESSION HISTORY
    // --------------------------------------------------------

    const existingEvents =
      await this.repository
        .findBySession(
          dto.sessionId,
        );

    // --------------------------------------------------------
    // CALCULATE SEQUENCE
    // --------------------------------------------------------

    const sequence =
      dto.sequence ??
      existingEvents.length + 1;

    if (
      !Number.isInteger(sequence) ||
      sequence < 1
    ) {

      throw new Error(
        'sequence must be a positive integer',
      );
    }

    // --------------------------------------------------------
    // CREATE EVENT
    // --------------------------------------------------------

    const event: PageDepthEvent = {
      id:
        this.generateId(),

      userId,

      sessionId:
        dto.sessionId,

      page:
        this.normalizePage(
          dto.page,
        ),

      depth:
        dto.depth,

      sequence,

      timestamp:
        new Date(),
    };

    // --------------------------------------------------------
    // PERSIST EVENT
    // --------------------------------------------------------

    return this.repository.create(
      event,
    );
  }

  // ==========================================================
  // GET SESSION DEPTH
  // ==========================================================

  async getSessionDepth(
    sessionId: string,
  ): Promise<SessionDepth> {

    if (
      !sessionId ||
      sessionId.trim().length === 0
    ) {

      throw new Error(
        'sessionId is required',
      );
    }

    const events =
      await this.repository
        .findBySession(
          sessionId,
        );

    if (
      events.length === 0
    ) {

      throw new Error(
        'Session not found',
      );
    }

    // --------------------------------------------------------
    // MAXIMUM DEPTH
    // --------------------------------------------------------

    const maxDepth =
      Math.max(
        ...events.map(
          event =>
            event.depth,
        ),
      );

    // --------------------------------------------------------
    // UNIQUE PAGES
    // --------------------------------------------------------

    const uniquePages =
      new Set(
        events.map(
          event =>
            event.page,
        ),
      );

    // --------------------------------------------------------
    // ORDER EVENTS
    // --------------------------------------------------------

    const sorted =
      [...events].sort(
        (
          a,
          b,
        ) =>
          a.timestamp.getTime() -
          b.timestamp.getTime(),
      );

    return {
      sessionId,

      userId:
        sorted.find(
          event =>
            event.userId,
        )?.userId,

      maxDepth,

      pagesVisited:
        events.length,

      uniquePages:
        uniquePages.size,

      startedAt:
        sorted[0].timestamp,

      lastActivityAt:
        sorted[
          sorted.length - 1
        ].timestamp,
    };
  }

  // ==========================================================
  // GET USER DEPTH
  // ==========================================================

  async getUserDepth(
    userId: string,
  ) {

    if (
      !userId ||
      userId.trim().length === 0
    ) {

      throw new Error(
        'userId is required',
      );
    }

    const events =
      await this.repository
        .findByUser(
          userId,
        );

    if (
      events.length === 0
    ) {

      return {
        userId,

        sessions: 0,

        pagesVisited: 0,

        maximumDepth: 0,

        averageDepth: 0,
      };
    }

    // --------------------------------------------------------
    // GROUP SESSIONS
    // --------------------------------------------------------

    const sessions =
      new Set(
        events.map(
          event =>
            event.sessionId,
        ),
      );

    // --------------------------------------------------------
    // MAXIMUM DEPTH
    // --------------------------------------------------------

    const maximumDepth =
      Math.max(
        ...events.map(
          event =>
            event.depth,
        ),
      );

    // --------------------------------------------------------
    // AVERAGE DEPTH
    // --------------------------------------------------------

    const depthTotal =
      events.reduce(
        (
          total,
          event,
        ) =>
          total +
          event.depth,
        0,
      );

    const averageDepth =
      depthTotal /
      events.length;

    return {
      userId,

      sessions:
        sessions.size,

      pagesVisited:
        events.length,

      maximumDepth,

      averageDepth:
        Number(
          averageDepth.toFixed(2),
        ),
    };
  }

  // ==========================================================
  // DEPTH DISTRIBUTION
  // ==========================================================

  async getDepthDistribution() {

    const events =
      await this.repository
        .findAll();

    const distribution =
      new Map<number, number>();

    for (
      const event of events
    ) {

      distribution.set(
        event.depth,
        (
          distribution.get(
            event.depth,
          ) ?? 0
        ) + 1,
      );
    }

    return Array.from(
      distribution.entries(),
    )
      .sort(
        (
          a,
          b,
        ) =>
          a[0] - b[0],
      )
      .map(
        ([
          depth,
          visits,
        ]) => ({
          depth,
          visits,
        }),
      );
  }

  // ==========================================================
  // PAGE DEPTH FUNNEL
  // ==========================================================

  async getDepthFunnel() {

    const events =
      await this.repository
        .findAll();

    /*
     * Group events by session.
     */

    const sessionMap =
      new Map<
        string,
        PageDepthEvent[]
      >();

    for (
      const event of events
    ) {

      const existing =
        sessionMap.get(
          event.sessionId,
        ) ?? [];

      existing.push(
        event,
      );

      sessionMap.set(
        event.sessionId,
        existing,
      );
    }

    // --------------------------------------------------------
    // COUNT SESSIONS REACHING EACH DEPTH
    // --------------------------------------------------------

    const depthSessions =
      new Map<number, Set<string>>();

    for (
      const [
        sessionId,
        sessionEvents,
      ]
      of sessionMap
    ) {

      const depths =
        new Set(
          sessionEvents.map(
            event =>
              event.depth,
          ),
        );

      for (
        const depth of depths
      ) {

        if (
          !depthSessions.has(
            depth,
          )
        ) {

          depthSessions.set(
            depth,
            new Set(),
          );
        }

        depthSessions
          .get(depth)!
          .add(sessionId);
      }
    }

    // --------------------------------------------------------
    // RETURN FUNNEL
    // --------------------------------------------------------

    return Array.from(
      depthSessions.entries(),
    )
      .sort(
        (
          a,
          b,
        ) =>
          a[0] - b[0],
      )
      .map(
        ([
          depth,
          sessions,
        ]) => ({
          depth,

          sessions:
            sessions.size,
        }),
      );
  }

  // ==========================================================
  // NORMALIZE PAGE
  // ==========================================================

  private normalizePage(
    page: string,
  ): string {

    const normalized =
      page.trim();

    /*
     * Prevent excessive URL/path sizes.
     */

    if (
      normalized.length > 2048
    ) {

      throw new Error(
        'page value is too long',
      );
    }

    return normalized;
  }

  // ==========================================================
  // ID
  // ==========================================================

  private generateId(): string {

    return [
      'page-depth',
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2),
    ].join('_');
  }
}

// ============================================================
// CONTROLLER
// ============================================================

@Controller('analytics/page-depth')
export class PageDepthController {

  constructor(
    private readonly service:
      PageDepthService,
  ) {}

  // ==========================================================
  // TRACK
  // ==========================================================

  @Post()
  async track(
    @Req() request: any,
    @Body() dto: TrackPageDepthDto,
  ) {

    /*
     * req.user is expected to be populated by the
     * authentication guard.
     *
     * Anonymous tracking can still be supported by allowing
     * userId to be undefined.
     */

    const userId =
      request.user?.id;

    return this.service.track(
      userId,
      dto,
    );
  }

  // ==========================================================
  // SESSION ANALYTICS
  // ==========================================================

  @Get('session/:sessionId')
  async session(
    @Req() request: any,
  ) {

    return this.service
      .getSessionDepth(
        request.params.sessionId,
      );
  }

  // ==========================================================
  // DEPTH DISTRIBUTION
  // ==========================================================

  @Get('distribution')
  async distribution() {

    return this.service
      .getDepthDistribution();
  }

  // ==========================================================
  // DEPTH FUNNEL
  // ==========================================================

  @Get('funnel')
  async funnel() {

    return this.service
      .getDepthFunnel();
  }
}

// ============================================================
// PRISMA MODEL
// ============================================================

/*
 * Add a model similar to this to schema.prisma:
 *
 *
 * model PageDepthEvent {
 *
 *   id        String   @id @default(cuid())
 *
 *   userId    String?
 *
 *   sessionId String
 *
 *   page      String
 *
 *   depth     Int
 *
 *   sequence  Int
 *
 *   timestamp DateTime @default(now())
 *
 *   user User? @relation(
 *     fields: [userId],
 *     references: [id],
 *     onDelete: Cascade
 *   )
 *
 *   @@index([sessionId])
 *   @@index([userId])
 *   @@index([depth])
 *   @@index([timestamp])
 * }
 *
 */

// ============================================================
// SQL MIGRATION
// ============================================================

/*
 *
 * CREATE TABLE page_depth_events (
 *
 *   id UUID PRIMARY KEY,
 *
 *   user_id UUID NULL,
 *
 *   session_id VARCHAR(255) NOT NULL,
 *
 *   page VARCHAR(2048) NOT NULL,
 *
 *   depth INTEGER NOT NULL,
 *
 *   sequence INTEGER NOT NULL,
 *
 *   timestamp TIMESTAMPTZ NOT NULL
 *     DEFAULT CURRENT_TIMESTAMP,
 *
 *   CONSTRAINT page_depth_positive
 *     CHECK (depth > 0),
 *
 *   CONSTRAINT page_sequence_positive
 *     CHECK (sequence > 0)
 * );
 *
 *
 * CREATE INDEX
 * page_depth_events_session_idx
 * ON page_depth_events(session_id);
 *
 *
 * CREATE INDEX
 * page_depth_events_user_idx
 * ON page_depth_events(user_id);
 *
 *
 * CREATE INDEX
 * page_depth_events_depth_idx
 * ON page_depth_events(depth);
 *
 *
 * CREATE INDEX
 * page_depth_events_timestamp_idx
 * ON page_depth_events(timestamp);
 *
 */

// ============================================================
// POSTGRESQL ANALYTICS QUERIES
// ============================================================

/*
 *
 * ------------------------------------------------------------
 * USERS REACHING EACH DEPTH
 * ------------------------------------------------------------
 *
 * SELECT
 *   depth,
 *   COUNT(DISTINCT session_id) AS sessions
 *
 * FROM page_depth_events
 *
 * GROUP BY depth
 *
 * ORDER BY depth ASC;
 *
 *
 *
 * ------------------------------------------------------------
 * AVERAGE PAGE DEPTH
 * ------------------------------------------------------------
 *
 * SELECT
 *   AVG(depth) AS average_depth
 *
 * FROM page_depth_events;
 *
 *
 *
 * ------------------------------------------------------------
 * MAXIMUM SESSION DEPTH
 * ------------------------------------------------------------
 *
 * SELECT
 *   session_id,
 *   MAX(depth) AS max_depth
 *
 * FROM page_depth_events
 *
 * GROUP BY session_id;
 *
 *
 *
 * ------------------------------------------------------------
 * DEEPEST SESSIONS
 * ------------------------------------------------------------
 *
 * SELECT
 *   session_id,
 *   MAX(depth) AS max_depth
 *
 * FROM page_depth_events
 *
 * GROUP BY session_id
 *
 * ORDER BY max_depth DESC;
 *
 *
 *
 * ------------------------------------------------------------
 * PAGES REACHED AT DEPTH
 * ------------------------------------------------------------
 *
 * SELECT
 *   depth,
 *   page,
 *   COUNT(*) AS visits
 *
 * FROM page_depth_events
 *
 * GROUP BY
 *   depth,
 *   page
 *
 * ORDER BY
 *   depth ASC,
 *   visits DESC;
 *
 */

// ============================================================
// FRONTEND EVENT EXAMPLE
// ============================================================

/*
 *
 * Whenever the frontend changes route:
 *
 *
 * await fetch(
 *   '/analytics/page-depth',
 *   {
 *     method: 'POST',
 *
 *     headers: {
 *       'Content-Type':
 *         'application/json',
 *     },
 *
 *     body: JSON.stringify({
 *
 *       sessionId:
 *         sessionStorage.getItem(
 *           'session_id',
 *         ),
 *
 *       page:
 *         window.location.pathname,
 *
 *       depth:
 *         currentDepth,
 *
 *       sequence:
 *         currentSequence,
 *
 *     }),
 *   },
 * );
 *
 *
 * Example journey:
 *
 *
 * /dashboard
 *     depth = 1
 *     sequence = 1
 *
 * /reports
 *     depth = 2
 *     sequence = 2
 *
 * /reports/123
 *     depth = 3
 *     sequence = 3
 *
 * /reports/123/details
 *     depth = 4
 *     sequence = 4
 *
 */

// ============================================================
// UNIT TESTS
// ============================================================

describe(
  'PageDepthService',
  () => {

    let service:
      PageDepthService;

    let repository:
      InMemoryPageDepthRepository;

    beforeEach(
      () => {

        repository =
          new InMemoryPageDepthRepository();

        service =
          new PageDepthService(
            repository,
          );
      },
    );

    // ========================================================
    // BASIC TRACKING
    // ========================================================

    it(
      'records a page depth event',
      async () => {

        const event =
          await service.track(
            'user-1',
            {
              sessionId:
                'session-1',

              page:
                '/dashboard',

              depth:
                1,
            },
          );

        expect(
          event.userId,
        ).toBe(
          'user-1',
        );

        expect(
          event.sessionId,
        ).toBe(
          'session-1',
        );

        expect(
          event.page,
        ).toBe(
          '/dashboard',
        );

        expect(
          event.depth,
        ).toBe(
          1,
        );
      },
    );

    // ========================================================
    // SEQUENCE
    // ========================================================

    it(
      'automatically calculates page sequence',
      async () => {

        const first =
          await service.track(
            'user-1',
            {
              sessionId:
                'session-1',

              page:
                '/dashboard',

              depth:
                1,
            },
          );

        const second =
          await service.track(
            'user-1',
            {
              sessionId:
                'session-1',

              page:
                '/reports',

              depth:
                2,
            },
          );

        expect(
          first.sequence,
        ).toBe(
          1,
        );

        expect(
          second.sequence,
        ).toBe(
          2,
        );
      },
    );

    // ========================================================
    // SESSION DEPTH
    // ========================================================

    it(
      'calculates maximum session depth',
      async () => {

        await service.track(
          'user-1',
          {
            sessionId:
              'session-1',

            page:
              '/dashboard',

            depth:
              1,
          },
        );

        await service.track(
          'user-1',
          {
            sessionId:
              'session-1',

            page:
              '/reports',

            depth:
              2,
          },
        );

        await service.track(
          'user-1',
          {
            sessionId:
              'session-1',

            page:
              '/reports/123',

            depth:
              3,
          },
        );

        const result =
          await service
            .getSessionDepth(
              'session-1',
            );

        expect(
          result.maxDepth,
        ).toBe(
          3,
        );

        expect(
          result.pagesVisited,
        ).toBe(
          3,
        );

        expect(
          result.uniquePages,
        ).toBe(
          3,
        );
      },
    );

    // ========================================================
    // REPEATED PAGE
    // ========================================================

    it(
      'tracks repeated pages without inflating unique page count',
      async () => {

        await service.track(
          'user-1',
          {
            sessionId:
              'session-2',

            page:
              '/dashboard',

            depth:
              1,
          },
        );

        await service.track(
          'user-1',
          {
            sessionId:
              'session-2',

            page:
              '/reports',

            depth:
              2,
          },
        );

        await service.track(
          'user-1',
          {
            sessionId:
              'session-2',

            page:
              '/dashboard',

            depth:
              3,
          },
        );

        const result =
          await service
            .getSessionDepth(
              'session-2',
            );

        expect(
          result.pagesVisited,
        ).toBe(
          3,
        );

        expect(
          result.uniquePages,
        ).toBe(
          2,
        );

        expect(
          result.maxDepth,
        ).toBe(
          3,
        );
      },
    );

    // ========================================================
    // DEPTH DISTRIBUTION
    // ========================================================

    it(
      'returns depth distribution',
      async () => {

        await service.track(
          'user-1',
          {
            sessionId:
              'session-1',

            page:
              '/',

            depth:
              1,
          },
        );

        await service.track(
          'user-1',
          {
            sessionId:
              'session-1',

            page:
              '/reports',

            depth:
              2,
          },
        );

        await service.track(
          'user-2',
          {
            sessionId:
              'session-2',

            page:
              '/',

            depth:
              1,
          },
        );

        const result =
          await service
            .getDepthDistribution();

        expect(
          result,
        ).toEqual([
          {
            depth: 1,
            visits: 2,
          },
          {
            depth: 2,
            visits: 1,
          },
        ]);
      },
    );

    // ========================================================
    // FUNNEL
    // ========================================================

    it(
      'builds a depth funnel by session',
      async () => {

        await service.track(
          'user-1',
          {
            sessionId:
              'session-1',

            page:
              '/',

            depth:
              1,
          },
        );

        await service.track(
          'user-1',
          {
            sessionId:
              'session-1',

            page:
              '/reports',

            depth:
              2,
          },
        );

        await service.track(
          'user-1',
          {
            sessionId:
              'session-1',

            page:
              '/reports/1',

            depth:
              3,
          },
        );

        await service.track(
          'user-2',
          {
            sessionId:
              'session-2',

            page:
              '/',

            depth:
              1,
          },
        );

        await service.track(
          'user-2',
          {
            sessionId:
              'session-2',

            page:
              '/reports',

            depth:
              2,
          },
        );

        const funnel =
          await service
            .getDepthFunnel();

        expect(
          funnel,
        ).toEqual([
          {
            depth: 1,
            sessions: 2,
          },
          {
            depth: 2,
            sessions: 2,
          },
          {
            depth: 3,
            sessions: 1,
          },
        ]);
      },
    );

    // ========================================================
    // INVALID DEPTH
    // ========================================================

    it(
      'rejects zero depth',
      async () => {

        await expect(
          service.track(
            'user-1',
            {
              sessionId:
                'session-1',

              page:
                '/dashboard',

              depth:
                0,
            },
          ),
        ).rejects.toThrow(
          'depth must be a positive integer',
        );
      },
    );

    // ========================================================
    // INVALID SESSION
    // ========================================================

    it(
      'rejects an empty session ID',
      async () => {

        await expect(
          service.track(
            'user-1',
            {
              sessionId:
                '',

              page:
                '/dashboard',

              depth:
                1,
            },
          ),
        ).rejects.toThrow(
          'sessionId is required',
        );
      },
    );

    // ========================================================
    // INVALID PAGE
    // ========================================================

    it(
      'rejects an empty page',
      async () => {

        await expect(
          service.track(
            'user-1',
            {
              sessionId:
                'session-1',

              page:
                '',

              depth:
                1,
            },
          ),
        ).rejects.toThrow(
          'page is required',
        );
      },
    );

    // ========================================================
    // ANONYMOUS USERS
    // ========================================================

    it(
      'supports anonymous sessions',
      async () => {

        const event =
          await service.track(
            undefined,
            {
              sessionId:
                'anonymous-session',

              page:
                '/landing',

              depth:
                1,
            },
          );

        expect(
          event.userId,
        ).toBeUndefined();

        expect(
          event.sessionId,
        ).toBe(
          'anonymous-session',
        );
      },
    );
  },
);

// ============================================================
// IMPORTANT DEFINITION
// ============================================================

/*
 *
 * PAGE DEPTH SHOULD MEAN NAVIGATION DEPTH, NOT URL DEPTH.
 *
 * For example:
 *
 *
 * /reports/123/details
 *
 *
 * does NOT automatically mean:
 *
 *
 * depth = 3
 *
 *
 * Instead, depth describes the user's navigation journey:
 *
 *
 * /dashboard
 *      ↓
 * /reports
 *      ↓
 * /reports/123
 *      ↓
 * /reports/123/details
 *
 *
 * depth:
 *
 *   1
 *   2
 *   3
 *   4
 *
 *
 * This gives analytics teams a useful measure of how deeply
 * users navigate into the application.
 *
 */

// ============================================================
// RECOMMENDED METRICS
// ============================================================

/*
 *
 * Once this is implemented, useful metrics include:
 *
 *
 * 1. Average page depth
 *
 * 2. Maximum page depth
 *
 * 3. Average pages per session
 *
 * 4. Percentage of sessions reaching depth 2
 *
 * 5. Percentage reaching depth 3
 *
 * 6. Percentage reaching depth 5
 *
 * 7. Deepest pages visited
 *
 * 8. Depth by user
 *
 * 9. Depth by session
 *
 * 10. Depth by date
 *
 * 11. Depth by authenticated vs anonymous users
 *
 * 12. Depth conversion funnel
 *
 */

// ============================================================
// END
// ============================================================
