import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface DashboardData {
  user: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  todayAttendance: {
    status: "not_punched" | "punched_in" | "punched_out" | "pending";
    punchInTime?: string;
    punchOutTime?: string;
    lastAttendance?: {
      date: string;
      punchIn: string;
      punchOut?: string;
      status: string;
    };
  };
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: "info" | "warning" | "success";
    createdAt: string;
  }>;
}

// Query: Get staff dashboard data
export function useStaffDashboard() {
  return useQuery({
    queryKey: ["staff", "dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/staff/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      return response.json() as Promise<DashboardData>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Mutation: Punch in/out
export function usePunchAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      imageData,
    }: {
      type: "in" | "out";
      imageData: string;
    }) => {
      // First, upload image
      const imageDataRes = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ image: imageData }),
        headers: { "Content-Type": "application/json" },
      });
      if (!imageDataRes.ok) {
        throw new Error("Image upload failed");
      }
      const res = await imageDataRes.json();
      const { imageUrl } = res;

      // Then, punch
      const response = await fetch("/api/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, imageUrl }),
      });

      if (!response.ok) {
        throw new Error("Punch failed");
      }
      return (await response.json()) as { success: boolean; attendance: any };
    },
    onMutate: async ({ type }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["staff", "dashboard"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["staff", "dashboard"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["staff", "dashboard"], (old: any) => {
        if (!old) return old;
        const newStatus = type === "in" ? "punched_in" : "punched_out";
        return {
          ...old,
          todayAttendance: {
            ...old.todayAttendance,
            status: newStatus,
          },
        };
      });

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(["staff", "dashboard"], context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] });
    },
  });
}
