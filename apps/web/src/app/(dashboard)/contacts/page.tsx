"use client";

import AddContactBook from "./add-contact-book";
import ContactBooksList from "./contact-books-list";
import { H1 } from "@usesend/ui";

export default function ContactsPage() {
  return (
    <div>
      <div className="flex justify-between items-start gap-4">
        <div>
          <H1>Audience</H1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact lists that your campaigns are sent to.
          </p>
        </div>
        <AddContactBook />
      </div>
      <ContactBooksList />
    </div>
  );
}
