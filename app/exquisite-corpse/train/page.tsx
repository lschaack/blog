import { auth } from '@/app/auth';
import { SignInButton } from '@/app/components/SignInButton';

export default async function TrainingInterface() {
  const session = await auth();

  if (!session) {
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
    )
  }

  return (
    <div>
      <h1>Protected Dashboard</h1>
      <p>Welcome, {session.user?.name}!</p>
    </div>
  )
}
