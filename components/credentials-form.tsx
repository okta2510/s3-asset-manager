"use client";

import React from "react"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { S3Credentials } from "@/lib/types";

/**
 * Props for the CredentialsForm component
 */
interface CredentialsFormProps {
  /** Initial credentials to populate the form (for editing) */
  initialCredentials?: S3Credentials | null;
  /** Callback function called when credentials are successfully saved */
  onSave: (credentials: S3Credentials) => void;
  /** Callback function called when connection test is requested */
  onTest: (credentials: S3Credentials) => Promise<boolean>;
  /** Whether the form is currently in a loading state */
  isLoading?: boolean;
}

/**
 * CredentialsForm Component
 * Renders a form for entering and validating S3 credentials
 * Includes fields for endpoint, region, access key, and secret key
 */
export function CredentialsForm({
  initialCredentials,
  onSave,
  onTest,
  isLoading = false,
}: CredentialsFormProps) {
  // Form state initialized with existing credentials or empty values
  const [credentials, setCredentials] = useState<S3Credentials>({
    endpoint: initialCredentials?.endpoint || "",
    region: initialCredentials?.region || "",
    accessKeyId: initialCredentials?.accessKeyId || "",
    secretAccessKey: initialCredentials?.secretAccessKey || "",
    bucket: initialCredentials?.bucket || "",
  });

  // Tracks whether connection test was successful
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Handles input field changes
   * Updates the corresponding field in the credentials state
   * @param field - The credential field to update
   * @param value - The new value for the field
   */
  const handleChange = (field: keyof S3Credentials, value: string) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
    // Reset test status when credentials change
    setTestStatus("idle");
    setErrorMessage("");
  };

  /**
   * Tests the connection with the provided credentials
   * Calls the onTest callback and updates status accordingly
   */
  const handleTestConnection = async () => {
    setTestStatus("testing");
    setErrorMessage("");

    try {
      const success = await onTest(credentials);
      setTestStatus(success ? "success" : "error");
      if (!success) {
        setErrorMessage("Failed to connect. Please check your credentials.");
      }
    } catch (error) {
      setTestStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Connection failed"
      );
    }
  };

  /**
   * Handles form submission
   * Saves credentials if connection test was successful
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (testStatus === "success") {
      onSave(credentials);
    }
  };

  /**
   * Validates that all required fields are filled
   * @returns true if all required fields have values
   */
  const isValid = () => {
    return (
      credentials.endpoint.trim() !== "" &&
      credentials.region.trim() !== "" &&
      credentials.accessKeyId.trim() !== "" &&
      credentials.secretAccessKey.trim() !== ""
    );
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>S3 Configuration</CardTitle>
        <CardDescription>
          Enter your S3-compatible storage credentials to connect
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Endpoint URL field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="endpoint">Endpoint URL</Label>
            <Input
              id="endpoint"
              type="url"
              placeholder="https://s3.amazonaws.com"
              value={credentials.endpoint}
              onChange={(e) => handleChange("endpoint", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The S3-compatible endpoint URL (e.g., AWS, MinIO, DigitalOcean
              Spaces)
            </p>
          </div>

          {/* Region field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              type="text"
              placeholder="us-east-1"
              value={credentials.region}
              onChange={(e) => handleChange("region", e.target.value)}
              required
            />
          </div>

          {/* Access Key ID field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="accessKeyId">Access Key ID</Label>
            <Input
              id="accessKeyId"
              type="text"
              placeholder="AKIAIOSFODNN7EXAMPLE"
              value={credentials.accessKeyId}
              onChange={(e) => handleChange("accessKeyId", e.target.value)}
              required
            />
          </div>

          {/* Secret Access Key field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="secretAccessKey">Secret Access Key</Label>
            <Input
              id="secretAccessKey"
              type="password"
              placeholder="Enter your secret key"
              value={credentials.secretAccessKey}
              onChange={(e) => handleChange("secretAccessKey", e.target.value)}
              required
            />
          </div>

          {/* Error message display */}
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}

          {/* Success message display */}
          {testStatus === "success" && (
            <p className="text-sm text-green-600">
              Connection successful! You can now save your credentials.
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={!isValid() || isLoading || testStatus === "testing"}
              className="flex-1 bg-transparent"
            >
              {testStatus === "testing" ? "Testing..." : "Test Connection"}
            </Button>
            <Button
              type="submit"
              disabled={testStatus !== "success" || isLoading}
              className="flex-1"
            >
              {isLoading ? "Saving..." : "Save & Connect"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
