import CompleteUpload from './CompleteUpload';
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <CompleteUpload />
    </Suspense>
  );
}
