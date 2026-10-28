"use client";

import { formatDistanceToNow } from "date-fns";
import { api } from "~/trpc/react";
import DeleteContactBook from "./delete-contact-book";
import Link from "next/link";
import EditContactBook from "./edit-contact-book";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useUrlState } from "~/hooks/useUrlState";
import { Input } from "@usesend/ui/src/input";
import { useDebouncedCallback } from "use-debounce";

export default function ContactBooksList() {
  const [search, setSearch] = useUrlState("search");
  const contactBooksQuery = api.contacts.getContactBooks.useQuery({
    search: search ?? undefined,
  });

  const router = useRouter();

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
  }, 1000);

  return (
    <div className="mt-10">
      <Input
        placeholder="Search contact book"
        className="w-[300px] mr-4 mb-4"
        defaultValue={search ?? ""}
        onChange={(e) => debouncedSearch(e.target.value)}
      />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
        {contactBooksQuery.data?.map((contactBook) => (
          <motion.div
            key={contactBook.id}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            whileTap={{ scale: 0.99 }}
            className="border rounded-md hover:bg-muted/40"
          >
            <div className="flex flex-col">
              <Link href={`/contacts/${contactBook.id}`} key={contactBook.id}>
                <div className="flex items-center justify-between gap-3 p-4 mb-4">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="shrink-0">{contactBook.emoji}</div>
                    <div
                      className="min-w-0 flex-1 truncate font-semibold"
                      title={contactBook.name}
                    >
                      {contactBook.name}
                    </div>
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-sm">
                    <span className="font-mono">
                      {contactBook._count.contacts}
                    </span>{" "}
                    {contactBook._count.contacts === 1 ? "contact" : "contacts"}
                  </div>
                </div>
              </Link>

              <div className="flex justify-between items-center border-t  bg-muted/50">
                <div
                  className="text-muted-foreground text-xs cursor-pointer w-full py-3 pl-4"
                  onClick={() => router.push(`/contacts/${contactBook.id}`)}
                >
                  {formatDistanceToNow(contactBook.createdAt, {
                    addSuffix: true,
                  })}
                </div>
                <div className="flex gap-3 pr-4">
                  <EditContactBook contactBook={contactBook} />
                  <DeleteContactBook contactBook={contactBook} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
