"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";

type TestItem = {
  id: string;
  key: string;
  description: string | null;
  suite_name: string;
  tags: string[] | null;
};

export function TestsList() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tests")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load tests");
        const body = (await response.json()) as { tests: TestItem[] };
        setTests(body.tests);
      })
      .catch(() => setError("Unable to load tests."));
  }, []);

  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <CardTitle>Test scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
          <Table>
            <thead>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Suite</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </thead>
            <tbody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell>
                    <Link className="underline-offset-2 hover:underline" href={`/tests/${test.id}`}>
                      {test.key}
                    </Link>
                  </TableCell>
                  <TableCell>{test.suite_name}</TableCell>
                  <TableCell>{test.description ?? "n/a"}</TableCell>
                  <TableCell>{(test.tags ?? []).join(", ") || "none"}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
