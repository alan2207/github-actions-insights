"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KeyIcon } from "lucide-react";
import { useEffect, useState } from "react";

export const API_KEY_KEY = "githubApiKey";

export const ApiKeyManager = () => {
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const saveApiKey = () => {
    localStorage.setItem(API_KEY_KEY, apiKey);
    setIsApiKeyModalOpen(false);
    window.location.reload();
  };
  return (
    <Dialog open={isApiKeyModalOpen} onOpenChange={setIsApiKeyModalOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <KeyIcon className="mr-2 h-4 w-4" />
          {apiKey ? "Edit API Key" : "Set API Key"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{apiKey ? "Edit API Key" : "Set API Key"}</DialogTitle>
        </DialogHeader>
        <p>
          You can get your GitHub API key{" "}
          <a
            href="https://github.com/settings/tokens/new?description=GitHub%20Actions%20Insights&scopes=repo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline"
          >
            here
          </a>
          .
        </p>
        <Input
          type="password"
          placeholder="Enter GitHub API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <Button onClick={saveApiKey}>Save API Key</Button>
      </DialogContent>
    </Dialog>
  );
};
