import { TestDetail } from "@/components/tests/test-detail";

export default async function TestPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  return <TestDetail testId={testId} />;
}
