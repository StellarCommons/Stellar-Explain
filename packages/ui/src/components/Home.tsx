/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivityItem } from "./ActivityItem";
import { NewsCarousel } from "./NewsCarousel";
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  Eye,
  EyeOff,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRetrieveInvestorDashboard } from "@/hook/portfolio/useRetrieveInvestorDashboard";
import { formatNaira } from "@/helper";
import { HomeSkeleton } from "@/components/shared/loader";
import { useRetrieveArticlesNewsFeed } from "@/hook/articles/useRetrieveArticlesNewsFeed";
import Image from "next/image";
import alarm from "@/assets/svg/alarm.svg";
import moneySack from "@/assets/svg/money-sack.svg";

const Home = () => {
  const { user } = useAuthStore();
  const [isValueVisible, setIsValueVisible] = useState(true);
  const { data: investments, isLoading: isFetchingDashboardData } =
    useRetrieveInvestorDashboard();

  const userName = user?.firstName || "John";

  // Derive state from data — no boolean flags needed
  const hasPortfolioData = investments?.data !== null;
  const portfolioData = investments?.data?.data;
  const hasActivities =
    investments?.data?.data?.recentActivities &&
    investments?.data?.data?.recentActivities?.length > 0;

  const { data: newsFeeds } = useRetrieveArticlesNewsFeed({
    isEditorsPick: true,
    per_page: 5,
  });

  const editorsPickPosts =
    newsFeeds?.data.filter((post) => post.isEditorsPick && !post.isFeatured) ??
    [];

  if (isFetchingDashboardData) {
    return <HomeSkeleton />;
  }

  return (
    <div className="space-y-6 mr-auto">
      {/* Greeting */}
      <div className="">
        <h1 className="text-2xl font-bold text-[#2D3748]">
          Hi {userName}{" "}
          <span role="img" aria-label="wave">
            😎
          </span>
        </h1>
        <p className="text-sm text-[#4A5565] mt-1">
          Welcome! Let's get started with your real estate investment journey
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 sm: mt-8 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Portfolio Value Card */}
          <Card className="p-6 gap-6 shadow-xs   bg-white rounded-2xl ">
            <div className="flex items-center justify-between ">
              <h3 className="text-lg font-medium text-text-primary">
                Total Portfolio Value
              </h3>
              <button
                onClick={() => setIsValueVisible(!isValueVisible)}
                className="h-8 w-8 rounded-md bg-[#00000012] text-text-primary flex items-center justify-center"
              >
                {isValueVisible ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Portfolio Value Display */}
            <div className="">
              {isValueVisible ? (
                <h2 className="text-5xl font-bold text-text-primary">
                  {formatNaira(portfolioData?.totalPortfolioValue ?? 0)}
                </h2>
              ) : (
                <h2 className="text-5xl font-bold text-text-primary">
                  ••••••••
                </h2>
              )}
            </div>

            {/* Monthly Change */}
            <div className="flex items-center gap-2">
              {isValueVisible ? (
                <>
                  <TrendingUp
                    className="h-5 w-5"
                    color={hasPortfolioData ? "#00A63E" : "#9CA3AF"}
                  />
                  <span className="text-base font-medium text-black">
                    {hasPortfolioData
                      ? `${portfolioData?.totalPortfolioValuePercentageIncrease}% this month`
                      : "No data yet"}
                  </span>
                </>
              ) : (
                <span className="text-base font-medium text-white">*</span>
              )}
            </div>

            <hr className="border-border" />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Total Invested */}
              <div>
                <p className="text-sm font-normal text-text-primary mb-1">
                  Total Invested
                </p>
                {isValueVisible ? (
                  <p className="text-2xl  font-medium text-text-primary">
                    {formatNaira(portfolioData?.totalInvested ?? 0)}
                  </p>
                ) : (
                  <p className="text-base font-medium text-text-primary">
                    ••••••••
                  </p>
                )}
              </div>

              {/* Total Returns */}
              <div>
                <p className="text-sm font-normal text-text-primary mb-1">
                  Total Returns
                </p>
                {isValueVisible ? (
                  <p className={cn("text-2xl text-primary-green font-msedium")}>
                    {formatNaira(portfolioData?.totalReturns ?? 0)}
                  </p>
                ) : (
                  <p className="text-base font-medium text-primary-green">
                    ••••••••
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
        {/*  */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 relative flex-flex-col overflow-hidden  gap-5 bg-[#DBEAFE] cursor-pointer border border-transparent hover:bg-white hover:border-[#3B82F6] hover:shadow-md transition-all duration-300 ease-in-out group">
            <Link href={"/vault"} className="flex flex-col space-y-2">
              <div className="flex items-start ">
                <div className="bg-primary-blue group-hover:bg-[#DBEAFE] transition-colors duration-300 p-2 rounded-sm">
                  <Wallet className="h-4 w-4 text-white group-hover:text-primary-blue transition-colors duration-300" />
                </div>
              </div>

              <p className="text-sm font-medium text-text-secondary ">
                Add money to your wallet to start investing{" "}
              </p>
              <div className="flex items-center gap-1 text-base font-medium text-primary-blue ">
                Fund Vault
                <ArrowRight
                  className="h-4 w-4 text-primary-blue group-hover:translate-x-1 transition-transform"
                  strokeWidth={2.5}
                />
              </div>
            </Link>
            <div className="absolute -bottom-2 -right-6 rotate-[-13deg]   p-2">
              <Image
                src={moneySack}
                alt="Hand Icon"
                width={151}
                height={105}
                className="animate-wave"
              />
            </div>
          </Card>
          <Card className="p-6 relative flex-flex-col overflow-hidden space-y-4 bg-[#D6FBE6] cursor-pointer border border-transparent hover:bg-white hover:border-[#00A63E] hover:shadow-md transition-all duration-300 ease-in-out group">
            <Link href={"/vault"} className="flex flex-col space-y-2">
              <div className="flex items-start ">
                <div className="bg-[#00A63E] group-hover:bg-secondary-green transition-colors duration-300 p-2 rounded-sm">
                  <Briefcase className="h-4 w-4 text-white group-hover:text-primary-green transition-colors duration-300" />
                </div>
              </div>

              <p className="text-sm font-medium text-text-secondary ">
                Top investment are going fast dont miss out{" "}
              </p>
              <div className="flex items-center gap-1 text-base font-medium text-[#00A63E] ">
                Invest Now
                <ArrowRight
                  className="h-4 w-4 text-[#00A63E] group-hover:translate-x-1 transition-transform"
                  strokeWidth={2.5}
                />
              </div>
            </Link>
            <div className="absolute -bottom-2 -right-6 rotate-[-13deg]   p-2">
              <Image
                src={alarm}
                alt="Hand Icon"
                width={151}
                height={105}
                className="animate-wave"
              />
            </div>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-1 mt-6 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 ">
          <div className="flex items-center justify-between ">
            <h3 className="text-lg mb-5 font-bold text-[#2D3748]">
              Recent Activities
            </h3>
            {hasActivities && (
              <Link href="/vault">
                <Button
                  variant="ghost"
                  className="text-primary-blue hover:text-primary-blue/95 hover:bg-transperent text-sm p-0 h-auto"
                >
                  View All
                </Button>
              </Link>
            )}
          </div>
          <Card className="p-6 bg-white shadow-xs space">
            {hasActivities ? (
              <div className="space-y-1 mt-4">
                {investments?.data?.data?.recentActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-y-6 items-center justify-center py-12 text-center">
                <div className=" p-2 bg-[#F7FAFC] h-16 w-16 rounded-full flex items-center justify-center">
                  <TrendingUp className=" text-[#CBD5E1]" size={28} />
                </div>
                <h4 className="text-base font-bold text-gray-900 mb-1">
                  No Activities yet
                </h4>
                <p className="text-sm text-gray-500 max-w-xs">
                  Your investment activities and transactions will appear here
                  once you start investing.
                </p>
                <Link href="/invest">
                  <Button size={"lg"} className="w-full h-12 font-normal">
                    Browse Properties
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
        {/* News Slider */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-transparent bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <NewsCarousel newsItems={editorsPickPosts} />
              </div>
            </div>
          </Card>
        </div>
      </div>
      {/* AI & market Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* <Card className="bg-white  sm:p-6">
          <div className="mb-4 flex max-sm:px-6 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              AI-Recommended Properties
            </h3>
            <Button
              variant="outline"
              className="h-auto w-fit rounded-sm border border-orange-400 bg-white px-3 py-1.5 text-xs font-medium text-[#D97706]"
            >
              Data-Driven
            </Button>
          </div>

          <div className="space-y-3">
            {propertyRecommendations.map((property) => (
              <PropertyRecommendationCard
                key={property.id}
                property={property}
              />
            ))}
          </div>
        </Card> */}
        
        {/* <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              Market Trends
            </h3>
            <Button
              variant="outline"
              className="text-xs font-light rounded-sm px-3 py-1.5 h-auto bg-gray-900 hover:bg-gray-900 text-white"
            >
              Live Data
            </Button>
          </div>

          <div className="space-y-3">
            {marketTrends.map((trend) => (
              <MarketTrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        </Card> */}
      </div>
    </div>
  );
};

export { Home };
