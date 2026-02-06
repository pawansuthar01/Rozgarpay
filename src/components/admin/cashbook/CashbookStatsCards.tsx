import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import { CashbookStats } from "@/types/cashbook";

interface CashbookStatsCardsProps {
  stats: CashbookStats | null;
  loading: boolean;
}

export default function CashbookStatsCards({
  stats,
  loading,
}: CashbookStatsCardsProps) {
  console.log(stats);
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <Skeleton height={16} width={100} className="mb-2" />
            <Skeleton height={24} width={60} />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: "Current Balance",
      value: stats.currentBalance,
      icon: DollarSign,
      color: stats.currentBalance >= 0 ? "text-green-600" : "text-red-600",
      bgColor: stats.currentBalance >= 0 ? "bg-green-50" : "bg-red-50",
      borderColor:
        stats.currentBalance >= 0 ? "border-green-200" : "border-red-200",
    },
    {
      title: "Total Credit",
      value: stats.totalCredit,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      title: "Total Debit",
      value: stats.totalDebit,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      title: "Transactions",
      value: stats.transactionCount,
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      isCount: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`bg-white p-4 md:p-6 rounded-xl shadow-sm border ${card.borderColor} ${card.bgColor}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">
                  {card.title}
                </p>
                <p className={`text-md md:text-xl font-bold ${card.color} `}>
                  {card.isCount
                    ? card.value?.toLocaleString()
                    : `₹${card.value?.toLocaleString()}`}
                </p>
              </div>
              <div className={`p-2 md:p-3 rounded-lg ${card.bgColor} ml-2`}>
                <Icon className={`h-5 w-5 md:h-5 md:w-5 ${card.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
