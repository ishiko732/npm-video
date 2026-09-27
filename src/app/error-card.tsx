"use client";

import {Button, Card} from "@heroui/react";

export function ErrorCard({
  packageName,
  message,
  onRetry,
}: {
  packageName: string;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <Card className="w-full h-full">
      <Card.Header>
        <Card.Title>Error</Card.Title>
        <Card.Description>
          {message ? "Could not load downloads" : "Package not found"}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <p role="alert">
          {message ?? (
            <>
              It looks like the package you entered (<strong>{packageName}</strong>) does not exist.
            </>
          )}
        </p>
        <Button className="mt-4" variant="outline" onPress={onRetry}>
          Retry
        </Button>
      </Card.Content>
    </Card>
  );
}
