import { auth } from '@/app/auth';
import { ErrorCard } from '@/app/components/ErrorCard';
import { SignInButton } from '@/app/components/SignInButton';
import { prisma, UserRole } from '@/app/lib/prisma';

function NoSession() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="card flex flex-col justify-center items-center gap-2 card font-geist-mono max-w-[40ch] text-center">
        <h2 className="text-2xl font-semibold [font-variant:all-small-caps]">Woah there buddy</h2>
        <p>
          This part of the app is only available to me personally.
        </p>
        <p>
          If you don&apos;t know whether or not you&apos;re me, then you&apos;re not.
        </p>
      </div>
      <SignInButton />
    </div>
  );
}

export default async function TrainingInterface() {
  const session = await auth();

  if (!session || !session.user) {
    return <NoSession />;
  } else if (!session.user) {
    return <ErrorCard error={{ message: "No user found on session" }} />;
  } else if (!session.user.email) {
    return <ErrorCard error={{ message: `No email found for user "${session.user.name}"` }} />;
  } else {
    const user = await prisma.user.findFirst({
      where: {
        email: session.user.email
      }
    });

    if (!user || user.role !== UserRole.ADMIN) {
      return <ErrorCard error={{ message: "You're not me!" }} />
    } else {
      return (
        <div>
          <h1>Protected Dashboard</h1>
          <p>Welcome, {session.user.name}!</p>
        </div>
      );
    }
  }
}
