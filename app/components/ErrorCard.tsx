type ErrorCardProps<TError extends { message: string } = Error> = {
  error: TError;
  title?: string;
}
export function ErrorCard<TError extends { message: string } = Error>({ error, title = "Error" }: ErrorCardProps<TError>) {
  return (
    <div className="card text-center">
      <div className="font-semibold text-2xl [font-variant:all-small-caps]">
        {title}
      </div>
      <div className="text-red-600 font-semibold font-geist-mono mt-2 max-w-[30ch]">
        {error.message}
      </div>
    </div>
  )
}

