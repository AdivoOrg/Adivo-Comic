export interface PaginationMeta {
  page: number;
  perPage: number;
  itemsCount: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface ApiSuccessEnvelope<T> {
  ok: true;
  data: T;
  pagination?: PaginationMeta | null;
}

export interface ApiErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    retryAfterSeconds?: number;
  };
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
