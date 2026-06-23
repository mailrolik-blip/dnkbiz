import type { Metadata } from 'next';
import Link from 'next/link';

import AiAssistantWizard, {
  type AiAssistantWizardSummary,
} from '@/app/ai-assistant/ai-assistant-wizard';
import { getOptionalCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'AI-помощник | Бизнес школа ДНК',
  description:
    'Короткий разбор задачи для пилотного AI-помощника DNK: тип бизнеса, боль, задачи, каналы и контакт.',
};

export default async function AiAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; new?: string }>;
}) {
  const currentUser = await getOptionalCurrentUser();
  const params = await searchParams;
  const shouldOpenDemo = params.mode === 'demo' && params.new !== '1' && Boolean(currentUser);
  const latestRequest = shouldOpenDemo && currentUser
    ? await prisma.aiAssistantRequest.findFirst({
        where: {
          userId: currentUser.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          businessType: true,
          channels: true,
          comment: true,
          contact: true,
          id: true,
          name: true,
          pain: true,
          status: true,
          tasks: true,
        },
      })
    : null;
  const initialSummary: AiAssistantWizardSummary | null = latestRequest
    ? {
        businessType: latestRequest.businessType,
        channels: Array.isArray(latestRequest.channels)
          ? latestRequest.channels.filter((item): item is string => typeof item === 'string')
          : [],
        comment: latestRequest.comment,
        contact: latestRequest.contact,
        name: latestRequest.name,
        pain: latestRequest.pain,
        requestId: latestRequest.id,
        status: latestRequest.status,
        tasks: Array.isArray(latestRequest.tasks)
          ? latestRequest.tasks.filter((item): item is string => typeof item === 'string')
          : [],
        user: currentUser
          ? {
              email: currentUser.email,
              id: currentUser.id,
              name: currentUser.name,
            }
          : null,
      }
    : null;

  return (
    <main className="page-shell ai-flow-page">
      <div className="top-nav">
        <Link className="brand" href="/">
          <span className="brand-mark" />
          <span>Бизнес школа ДНК</span>
        </Link>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <Link className="ghost-button" href="/lk">
            Личный кабинет
          </Link>
          {currentUser?.role === 'ADMIN' ? (
            <Link className="ghost-button" href="/admin">
              Админ
            </Link>
          ) : null}
        </div>
      </div>

      <section className="dnk-section ai-flow-shell">
        <header className="ai-flow-header">
          <span className="badge badge-pending">Тестовый пилот</span>
          <h1>AI-помощник</h1>
          <p>Подберите сценарий помощника под вашу задачу</p>
        </header>

        <AiAssistantWizard
          currentUser={
            currentUser
              ? {
                  email: currentUser.email,
                  id: currentUser.id,
                  name: currentUser.name,
                }
              : null
          }
          initialSummary={initialSummary}
        />
      </section>
    </main>
  );
}

