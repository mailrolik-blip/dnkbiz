export async function POST() {
  return Response.json(
    {
      error: 'Маршрут archived. Основной продукт DNK Biz больше не использует program requests.',
    },
    { status: 410 }
  );
}
