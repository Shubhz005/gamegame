"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DotIcon,
  ExternalLink,
  ImageIcon,
  LoaderCircleIcon,
  MessageCircle,
  MessageCircleQuestion,
  X,
} from "lucide-react";
import Link from "next/link";
import { Message, useChat } from "ai/react";
import Markdown from "react-markdown";
import { useEffect, useRef } from "react";
import Image from "next/image";

const SystemMessage = ({
  message,
  isStreaming,
  isCurrent,
  onFollowUp,
}: {
  message: Message;
  isStreaming: boolean;
  isCurrent: boolean;
  onFollowUp: (followUp: string) => void;
}) => {
  let parsed;
  try {
    parsed = JSON.parse(message.content);
  } catch (err) {
    if (isStreaming) return null;
    console.error("invalid payload", message);
    return (
      <ErrorMessage
        error={
          new Error(
            "There was an error processing your request. Please try again.",
            {
              cause: err,
            }
          )
        }
      />
    );
  }

  const { answer, followUps, resources } = parsed as {
    answer?: string;
    followUps?: string[];
    resources?: { name: string; id: string }[];
  };
  if (!answer) {
    console.error("no answer in JSON payload", message);
    return (
      <ErrorMessage
        error={
          new Error(
            "There was an error processing your request. Please try again."
          )
        }
      />
    );
  }
  return (
    <div className="flex flex-col">
      <Markdown className="prose prose-invert lg:prose-base prose-sm">
        {answer}
      </Markdown>
      {!!resources?.length && (
        <div className="mt-4 flex flex-col gap-2 text-sm flex-wrap">
          <h4 className="text-xs font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-2">
            Resources
            <ExternalLink className="w-3 h-3" />
          </h4>
          <ul className="flex flex-row gap-2 text-xs flex-wrap">
            {resources.map((resource) => (
              <li key={resource.id}>
                <Button variant="secondary" size="sm" asChild>
                  <a
                    href={`/resources/${resource.id}/download`}
                    target="_blank"
                  >
                    {resource.name}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isCurrent && !!followUps?.length && (
        <div className="mt-4 flex flex-col gap-2 text-sm flex-wrap">
          <h4 className="text-xs font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-2">
            Follow Ups
            <MessageCircleQuestion className="w-3 h-3" />
          </h4>
          <ul className="flex flex-col gap-2 text-sm flex-wrap">
            {followUps.map((followUp) => (
              <li key={followUp}>
                <Button
                  variant="default"
                  size="sm"
                  className="whitespace-normal text-left py-2 block h-auto"
                  onClick={() => onFollowUp(followUp)}
                >
                  {followUp}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const UserMessage = ({ message }: { message: Message }) => {
  return (
    <div className="font-semibold rounded bg-muted text-muted-foreground self-end p-2 lg:p-3">
      <Markdown className="prose prose-invert lg:prose-base prose-sm">
        {message.content}
      </Markdown>
    </div>
  );
};

const ErrorMessage = ({ error }: { error: Error }) => {
  let message;
  if (error.message.includes("Rate limit exceeded")) {
    message = "Rate limit exceeded. Try again in a bit.";
  } else {
    message = error.toString();
  }

  return (
    <div className="bg-destructive text-destructive-foreground font-bold p-4 rounded mb-4">
      {message}
    </div>
  );
};

export function Chat({
  game,
}: {
  game: {
    id: string;
    name: string;
    imageUrl: string | null;
    resourceCount: number;
  };
}) {
  const {
    messages,
    input,
    error,
    append,
    isLoading,
    handleInputChange,
    handleSubmit,
  } = useChat({
    api: `/api/ask/${game.id}`,
    maxToolRoundtrips: 2,
  });

  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const visibleMessages = messages.filter(
    (m, index) =>
      m.content &&
      m.content !== "" &&
      (index !== messages.length - 1 || !isLoading || m.role === "user")
  );

  useEffect(() => {
    setTimeout(() => ref.current?.scrollIntoView());
  }, [visibleMessages.length]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <>
      <div className="flex justify-between items-center h-16 lg:h-24 overflow-hidden absolute top-0 left-0 right-0 pl-4 lg:px-4 gap-4 border-b bg-card">
        <div className="flex items-end gap-4 overflow-hidden whitespace-nowrap">
          <div className="w-8 h-8 lg:w-20 lg:h-20 relative">
            {game.imageUrl ? (
              <Image
                src={game.imageUrl}
                alt={game.name}
                fill
                style={{
                  objectFit: "cover",
                  objectPosition: "top",
                }}
              />
            ) : (
              <ImageIcon className="w-20 h-20 text-muted-foreground" />
            )}
          </div>

          <div>
            <h2 className="text-xl lg:text-3xl font-bold">{game.name}</h2>
            <p className="text-muted-foreground text-sm hidden lg:block">
              {game.resourceCount} resources
              <Button
                size="sm"
                variant="link"
                onClick={() => {
                  append({
                    role: "user",
                    content: "What resources are you using?",
                  });
                }}
              >
                What are they?
              </Button>
            </p>
          </div>
        </div>
        <Button asChild variant="ghost">
          <Link href="/" prefetch={false}>
            <X className="w-6 h-6 lg:w-8 lg:h-8" />
            <span className="sr-only">Close chat</span>
          </Link>
        </Button>
      </div>
      <Card className="flex-1 flex rounded-none lg:rounded-xl min-h-screen max-w-full overflow-hidden h-screen w-full">
        <CardContent className="flex-1 flex items-stretch flex-col pt-20 lg:pt-32 pb-4 px-4">
          {error && <ErrorMessage error={error} />}
          <div className="flex-1 overflow-y-auto mb-4 gap-2 flex flex-col">
            {visibleMessages.length > 0 ? (
              visibleMessages.map((m, index) => (
                <div key={m.id} className="flex flex-col gap-0">
                  {m.role === "user" ? (
                    <UserMessage message={m} />
                  ) : (
                    <SystemMessage
                      message={m}
                      isStreaming={
                        index === visibleMessages.length - 1 && isLoading
                      }
                      isCurrent={index === visibleMessages.length - 1}
                      onFollowUp={(followUp) => {
                        append({
                          role: "user",
                          content: followUp,
                        });
                      }}
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col gap-6 items-center justify-center text-muted-foreground lg:text-lg">
                <MessageCircleQuestion className="hidden lg:block w-24 h-24" />
                <p>What are you about to start fisticuffs over?</p>
              </div>
            )}
            {isLoading && (
              <div className="flex flex-row items-center">
                <DotIcon className="w-5 h-5 animate-pulse" />
                <DotIcon className="w-5 h-5 animate-pulse" />
                <DotIcon className="w-5 h-5 animate-pulse" />
              </div>
            )}
            <div ref={ref} />
          </div>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              className="bg-background text-foreground placeholder-text-muted-foreground px-3 py-5"
              value={input}
              placeholder={`Ask a question about ${game.name}...`}
              onChange={handleInputChange}
              ref={inputRef}
            />
            <Button type="submit" disabled={isLoading} className="gap-2">
              {!isLoading ? (
                <MessageCircle className="w-5 h-5" />
              ) : (
                <LoaderCircleIcon className="w-5 h-5 animate-spin" />
              )}
              <span className="hidden lg:inline">Ask</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
