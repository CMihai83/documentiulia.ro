"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, forumApi, courseApi } from "@/lib/api";

// Forum category interface
interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  topicCount: number;
  postCount: number;
}

// Forum Hooks
export function useForumCategories() {
  return useQuery({
    queryKey: ["forum", "categories"],
    queryFn: async () => {
      const { data } = await forumApi.getCategories();
      // API returns array directly, map to expected format
      return {
        data: (data as ForumCategory[]).map(cat => ({
          id: cat.slug || cat.id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          topicsCount: cat.topicCount || 0,
          postsCount: cat.postCount || 0,
        }))
      };
    },
  });
}

export function useForumTopics(params?: { category?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["forum", "topics", params],
    queryFn: async () => {
      const { data } = await forumApi.getTopics(params);
      // Return as-is, API returns { data: [], meta: {} }
      return data;
    },
  });
}

export function useForumStats() {
  return useQuery({
    queryKey: ["forum", "stats"],
    queryFn: async () => {
      try {
        const { data } = await forumApi.getStats();
        return data;
      } catch {
        // Return default stats if endpoint fails
        return {
          totalTopics: 0,
          totalPosts: 0,
          totalMembers: 0,
          onlineNow: 0,
        };
      }
    },
  });
}

// Course interface
interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  instructor?: { firstName: string; lastName: string };
  instructorId?: string;
  duration?: number;
  difficulty?: string;
  isFree?: boolean;
  price?: string;
  category?: string;
  ratingAvg?: string;
  ratingCount?: number;
  _count?: { lessons: number; enrollments: number };
}

// Courses Hooks
export function useCourses(params?: { category?: string; difficulty?: string; page?: number }) {
  return useQuery({
    queryKey: ["courses", params],
    queryFn: async () => {
      const { data } = await courseApi.getAll(params);
      // API returns { data: [...], meta: {...} }
      const courses = data.data || data;
      return {
        data: (courses as Course[]).map(course => ({
          id: course.id,
          slug: course.slug,
          title: course.title,
          description: course.shortDescription || course.description,
          instructor: course.instructor
            ? `${course.instructor.firstName} ${course.instructor.lastName}`
            : "DocumentIulia",
          duration: course.duration ? `${Math.floor(course.duration / 60)}h ${course.duration % 60}min` : "1h",
          lessons: course._count?.lessons || 0,
          students: course._count?.enrollments || 0,
          rating: parseFloat(course.ratingAvg || "0") || 4.5,
          reviews: course.ratingCount || 0,
          level: course.difficulty === "BEGINNER" ? "Începător"
            : course.difficulty === "INTERMEDIATE" ? "Intermediar"
            : course.difficulty === "ADVANCED" ? "Avansat" : "Începător",
          isFree: course.isFree || false,
          price: course.price ? `${course.price} RON` : undefined,
          category: course.category || "General",
        }))
      };
    },
  });
}

export function useCourse(slug: string) {
  return useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data } = await courseApi.getBySlug(slug);
      return data;
    },
    enabled: !!slug,
  });
}

export function useCourseCategories() {
  return useQuery({
    queryKey: ["courses", "categories"],
    queryFn: async () => {
      try {
        const { data } = await courseApi.getCategories();
        return { data: data };
      } catch {
        // Return default categories if endpoint fails
        return {
          data: [
            { name: "Toate", count: 4 },
            { name: "e-Factura", count: 1 },
            { name: "SAF-T", count: 1 },
            { name: "Fiscalitate", count: 1 },
            { name: "Contabilitate", count: 1 },
          ]
        };
      }
    },
  });
}

export function usePopularCourses() {
  return useQuery({
    queryKey: ["courses", "popular"],
    queryFn: async () => {
      try {
        const { data } = await courseApi.getPopular();
        return data;
      } catch {
        return { data: [] };
      }
    },
  });
}

// Health Check Hook
export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data } = await api.get("/health");
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Dashboard Hooks
export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await api.get("/companies");
      return data;
    },
  });
}

export function useCompanyClients(companyId: string) {
  return useQuery({
    queryKey: ["companies", companyId, "clients"],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${companyId}/clients`);
      return data;
    },
    enabled: !!companyId,
  });
}

export function useInvoices(companyId?: string) {
  return useQuery({
    queryKey: ["invoices", companyId],
    queryFn: async () => {
      const headers = companyId ? { "X-Company-ID": companyId } : {};
      const { data } = await api.get("/invoices", { headers });
      return data;
    },
  });
}

export function useActivity(limit: number = 10) {
  return useQuery({
    queryKey: ["activity", limit],
    queryFn: async () => {
      const { data } = await api.get("/activity", { params: { limit } });
      return data;
    },
  });
}

export function useDashboardStats(companyId: string) {
  return useQuery({
    queryKey: ["dashboard", "stats", companyId],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/companies/${companyId}/stats`);
        return data;
      } catch {
        // Return default stats if endpoint fails
        return {
          totalRevenue: 0,
          totalExpenses: 0,
          unpaidInvoices: 0,
          activeClients: 0,
        };
      }
    },
    enabled: !!companyId,
  });
}
