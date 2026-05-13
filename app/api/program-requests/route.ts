export async function POST() {
  return Response.json(
    {
      error: 'Маршрут архивирован. Заявки на программы больше не используются.',
    },
    { status: 410 }
  );
}
