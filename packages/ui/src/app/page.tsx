// Fix: replace copied Home.tsx with minimal working page (#1303)
export default function HomePage() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center p-8'>
      <h1 className='text-3xl font-bold'>Stellar Explain</h1>
      <p className='mt-4 text-gray-600'>Enter a Stellar transaction hash or account address.</p>
    </main>
  );
}
