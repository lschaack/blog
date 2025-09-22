import { signIn } from "@/app/auth";
import { Button } from "./Button";

export function SignInButton() {
  return (
    <form action={async () => {
      "use server";

      await signIn();
    }}>
      <Button label="Sign in" className="max-w-fit" />
    </form>
  );
}
