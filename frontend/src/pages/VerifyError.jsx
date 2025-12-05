const VerifyError = () => {
  return (
    <div className="pt-40 text-center">
      <h1 className="text-3xl font-bold text-red-600">Verification failed</h1>
      <p className="mt-3 text-gray-700">The verification link is invalid or expired.</p>
    </div>
  );
};

export default VerifyError;
