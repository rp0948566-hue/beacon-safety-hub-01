import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
      <div className="glass-effect rounded-2xl p-6 shadow-[var(--shadow-card)] transform transition-all hover:scale-[1.02]">
        <h3 className="text-xl font-bold gradient-text mb-4">Add Emergency Contact</h3>
        <div className="space-y-4">
          <Input
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-background/50 border-border/50"
          />
          <Input
            placeholder="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="bg-background/50 border-border/50"
          />
          <Input
            placeholder="Email Address (Optional)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-background/50 border-border/50"
          />
          <Button
            onClick={handleAdd}
            className="w-full bg-gradient-to-r from-primary to-secondary text-white border-0 hover:opacity-90 transition-all hover:scale-[1.02]"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Contact
          </Button>
        </div>
      </div>

      {contacts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Your Emergency Contacts</h3>
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              className="glass-effect p-4 flex items-center justify-between transform transition-all hover:scale-[1.01] hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.phone}</p>
                  {contact.email && (
                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(contact.id)}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactForm;
