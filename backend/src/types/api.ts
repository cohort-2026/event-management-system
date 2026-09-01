export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
