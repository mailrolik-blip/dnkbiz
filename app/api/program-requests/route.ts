import { getShowcaseProgramBySlug } from '@/lib/programs';
import prisma from '@/lib/prisma';

type ProgramRequestPayload = {
  comment?: unknown;
  companyName?: unknown;
  email?: unknown;
  isCompanyRequest?: unknown;
  name?: unknown;
  phone?: unknown;
  programSlug?: unknown;
};

function normalizeString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeOptionalString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function isValidEmail(value: string | null) {
  if (!value) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ProgramRequestPayload | null;
  const programSlug = normalizeString(body?.programSlug);
  const name = normalizeString(body?.name);
  const email = normalizeOptionalString(body?.email);
  const phone = normalizeOptionalString(body?.phone);
  const companyName = normalizeOptionalString(body?.companyName);
  const comment = normalizeOptionalString(body?.comment);
  const isCompanyRequest = Boolean(body?.isCompanyRequest);

  if (!programSlug) {
    return Response.json({ error: 'Не удалось определить программу.' }, { status: 400 });
  }

  const program = getShowcaseProgramBySlug(programSlug);

  if (!program) {
    return Response.json({ error: 'Программа не найдена.' }, { status: 404 });
  }

  if (name.length < 2) {
    return Response.json(
      { error: 'Укажите имя, чтобы мы могли связаться с вами.' },
      { status: 400 }
    );
  }

  if (!email && !phone) {
    return Response.json(
      { error: 'Оставьте телефон или email для обратной связи.' },
      { status: 400 }
    );
  }

  if (email && !isValidEmail(email)) {
    return Response.json(
      { error: 'Проверьте email: формат выглядит некорректно.' },
      { status: 400 }
    );
  }

  const lead = await prisma.programRequest.create({
    data: {
      programSlug: program.slug,
      programTitle: program.title,
      name,
      email,
      phone,
      companyName,
      comment,
      isCompanyRequest,
    },
    select: {
      id: true,
      programSlug: true,
      programTitle: true,
      createdAt: true,
      isCompanyRequest: true,
    },
  });

  return Response.json(
    {
      request: {
        id: lead.id,
        programSlug: lead.programSlug,
        programTitle: lead.programTitle,
        createdAt: lead.createdAt.toISOString(),
        isCompanyRequest: lead.isCompanyRequest,
      },
    },
    { status: 201 }
  );
}
