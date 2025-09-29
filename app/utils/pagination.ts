type PerPage = {
  page: number;
  perPage: number;
}

type LimitOffset = {
  limit: number;
  offset: number;
}

export const toLimitOffset = ({ page, perPage }: PerPage): LimitOffset => {
  const offset = Math.max(page - 1, 0) * perPage;

  return {
    limit: perPage,
    offset,
  };
}
