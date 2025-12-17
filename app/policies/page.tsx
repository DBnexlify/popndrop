export default function PoliciesPage() {
  return (
    <main className="mx-auto max-w-5xl p-4 pb-24">
      <h1 className="text-2xl font-semibold">Policies</h1>

      <div className="mt-4 space-y-4 text-sm">
        <section>
          <h2 className="font-medium">Deposit</h2>
          <p className="mt-1 opacity-80">
            A deposit is required to hold your date. Details will be shown during booking.
          </p>
        </section>

        <section>
          <h2 className="font-medium">Weather</h2>
          <p className="mt-1 opacity-80">
            Safety comes first. If weather is unsafe, we will work with you to reschedule.
          </p>
        </section>

        <section>
          <h2 className="font-medium">Delivery and setup</h2>
          <p className="mt-1 opacity-80">
            Delivery windows and setup requirements will be confirmed after booking.
          </p>
        </section>
      </div>
    </main>
  );
}
