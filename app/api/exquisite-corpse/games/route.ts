import { NextResponse } from "next/server";
import { compose } from "../../middleware/compose";
import { withAuth } from "../../middleware/authorization";
import { getGameService } from "@/app/lib/gameService";
import { toLimitOffset } from "@/app/utils/pagination";

export const GET = compose(
  withAuth,
)(
  async (
    request,
  ) => {
    const rawPage = request.nextUrl.searchParams.get('page');
    const rawPerPage = request.nextUrl.searchParams.get('perPage');

    if (!rawPage || !rawPerPage) {
      return NextResponse.json(
        { error: 'Missing pagination parameters' },
        { status: 400 }
      );
    }

    const page = parseInt(rawPage);
    const perPage = parseInt(rawPerPage);

    if (isNaN(page) || isNaN(perPage)) {
      return NextResponse.json(
        { error: 'Pagination parameters cannot be parsed' },
        { status: 400 }
      );
    }

    const { limit, offset } = toLimitOffset({ page, perPage });

    const result = await getGameService().getGames(limit, offset);

    return NextResponse.json(result);
  }
)
