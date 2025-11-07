import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface ContactFormProps {
  onContactsChange?: (contacts: Contact[]) => void;
}

const ContactForm = ({ onContactsChange }: ContactFormProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Default emergency contacts that are always included
  const defaultContacts = [
    {
      id: "default_1",
      name: "Emergency Contact",
      phone: "+919303646441",
      email: "rp0948566@gmail.com"
    },
    {
      id: "default_2",
      name: "Vansh Pratap singh chauhan",
      phone: "+919243586912",
      email: "chauhanvanshpratapsingh@gmail.com"
    }
  ];

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: ""
  });

  const handleAdd = () => {
    if (!formData.name || !formData.phone) {
      toast.error("Please fill in name and phone number");
      return;
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      ...formData
    };

    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    onContactsChange?.(updatedContacts);
    setFormData({ name: "", phone: "", email: "" });
    toast.success("Emergency contact added!");
  };

  const handleDelete = (id: string) => {
    const updatedContacts = contacts.filter(c => c.id !== id);
    setContacts(updatedContacts);
    onContactsChange?.(updatedContacts);
    toast.success("Contact removed");
  };

  return (
    <div className="space-y-6">
      <div className="glass-effect rounded-2xl p-6 shadow-[var(--shadow-card)] transform transition-all hover:scale-[1.02] bg-card/80 dark:bg-card/60 border border-border/20 dark:border-border/30">
        <h3 className="text-xl font-bold gradient-text mb-4">Add Emergency Contact</h3>
        <div className="space-y-4">
          <Input
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-background/90 dark:bg-white/10 border-border/80 dark:border-white/30 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/60 focus:border-primary/60 dark:focus:border-primary/70"
          />
          <Input
            placeholder="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="bg-background/90 dark:bg-white/10 border-border/80 dark:border-white/30 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/60 focus:border-primary/60 dark:focus:border-primary/70"
          />
          <Input
            placeholder="Email Address (Optional)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-background/90 dark:bg-white/10 border-border/80 dark:border-white/30 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/60 focus:border-primary/60 dark:focus:border-primary/70"
          />
          <Button
            onClick={handleAdd}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white border-0 hover:opacity-90 transition-all hover:scale-[1.02] shadow-lg dark:shadow-primary/20"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Contact
          </Button>
        </div>
      </div>

      {(contacts.length > 0 || defaultContacts.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Your Emergency Contacts</h3>

          {/* Default Contacts Section */}
          {defaultContacts.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Default Emergency Contacts</h4>
              {defaultContacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="glass-effect p-4 flex items-center justify-between transform transition-all hover:scale-[1.01] hover:shadow-lg bg-card/90 dark:bg-white/5 border border-border/80 dark:border-white/30 mb-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg dark:shadow-primary/20">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground dark:text-white">{contact.name}</p>
                      <p className="text-sm text-muted-foreground dark:text-white/80">{contact.phone}</p>
                      {contact.email && (
                        <p className="text-xs text-muted-foreground dark:text-white/70">{contact.email}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Default</Badge>
                </Card>
              ))}
            </div>
          )}

          {/* User-Added Contacts Section */}
          {contacts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Your Added Contacts</h4>
              {contacts.map((contact) => (
                <Card
                  key={contact.id}
                  className="glass-effect p-4 flex items-center justify-between transform transition-all hover:scale-[1.01] hover:shadow-lg bg-card/90 dark:bg-white/5 border border-border/80 dark:border-white/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg dark:shadow-primary/20">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground dark:text-white">{contact.name}</p>
                      <p className="text-sm text-muted-foreground dark:text-white/80">{contact.phone}</p>
                      {contact.email && (
                        <p className="text-xs text-muted-foreground dark:text-white/70">{contact.email}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(contact.id)}
                    className="hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20 dark:hover:text-destructive"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactForm;
