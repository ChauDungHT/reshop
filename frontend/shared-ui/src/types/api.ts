export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface IPaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export type IPaginatedResponse<T> = IApiResponse<IPaginatedData<T>>;
