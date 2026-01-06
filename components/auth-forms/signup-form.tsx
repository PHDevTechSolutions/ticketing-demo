"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export function SignupForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [Firstname, setFirstname] = useState("");
    const [Lastname, setLastname] = useState("");
    const [Email, setEmail] = useState("");
    const [Password, setPassword] = useState("");
    const [ConfirmPassword, setConfirmPassword] = useState("");

    const [Role, setRole] = useState("guest");
    const [ReferenceID, setReferenceID] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    // Auto-generate reference ID
    useEffect(() => {
        if (!Firstname || !Lastname) return;
        const refID = `${Firstname[0].toUpperCase()}${Lastname[0].toUpperCase()}-${Math.floor(
            100000 + Math.random() * 900000
        )}`;
        setReferenceID(refID);
    }, [Firstname, Lastname]);

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!Firstname || !Lastname || !Email || !Password || !ConfirmPassword) {
            toast.error("All fields are required.");
            return;
        }

        if (Password !== ConfirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    Firstname,
                    Lastname,
                    Email,
                    Password,
                    Role,
                    ReferenceID,
                }),
            });

            const result = await res.json();

            if (res.ok) {
                toast.success("Account created successfully!");
                setTimeout(() => router.push("/auth/login"), 1200);
            } else {
                toast.error(result.message || "Registration failed.");
            }
        } catch {
            toast.error("Server error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">

                    {/* FORM SECTION */}
                    <form onSubmit={handleSubmit} className="p-6 md:p-8">
                        <FieldGroup>

                            {/* Title */}
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">Create your account</h1>
                                <p className="text-muted-foreground text-sm">
                                    Enter your details below to create your account
                                </p>
                            </div>

                            <div className="flex gap-4">
                                {/* First Name */}
                                <Field className="flex-1">
                                    <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                                    <Input
                                        id="firstName"
                                        required
                                        value={Firstname}
                                        onChange={(e) => setFirstname(e.target.value)}
                                    />
                                </Field>

                                {/* Last Name */}
                                <Field className="flex-1">
                                    <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                                    <Input
                                        id="lastName"
                                        required
                                        value={Lastname}
                                        onChange={(e) => setLastname(e.target.value)}
                                    />
                                </Field>
                            </div>


                            {/* Email */}
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={Email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <FieldDescription>
                                    We will not share your email with anyone.
                                </FieldDescription>
                            </Field>

                            {/* Passwords */}
                            <Field>
                                <FieldLabel>Password</FieldLabel>

                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={Password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-0 h-full px-3"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                <FieldLabel className="mt-4">Confirm Password</FieldLabel>
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={ConfirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />

                                <FieldDescription>
                                    Must be at least 8 characters long.
                                </FieldDescription>
                            </Field>

                            {/* Role Selector */}
                            <Field>
                                <RadioGroup
                                    value={Role}
                                    onValueChange={setRole}
                                    className="grid grid-cols-2 gap-3 pt-1"
                                >
                                    <RadioGroupItem value="admin" id="role-admin" className="sr-only" />
                                    <Label
                                        htmlFor="role-admin"
                                        className={cn(
                                            "p-3 rounded-xl border cursor-pointer flex justify-center",
                                            Role === "admin" ? "border-primary bg-primary/10" : "border-input"
                                        )}
                                    >
                                        Admin
                                    </Label>

                                    <RadioGroupItem value="guest" id="role-guest" className="sr-only" />
                                    <Label
                                        htmlFor="role-guest"
                                        className={cn(
                                            "p-3 rounded-xl border cursor-pointer flex justify-center",
                                            Role === "guest" ? "border-primary bg-primary/10" : "border-input"
                                        )}
                                    >
                                        Guest
                                    </Label>
                                </RadioGroup>
                            </Field>

                            {/* Hidden Reference ID */}
                            <input type="hidden" value={ReferenceID} readOnly />

                            {/* Submit */}
                            <Field>
                                <Button
                                    type="submit"
                                    className="w-full bg-primary text-primary-foreground"
                                    disabled={loading}
                                >
                                    {loading ? "Creating account..." : "Create account"}
                                </Button>
                            </Field>

                            <FieldSeparator>Or continue with</FieldSeparator>

                            <FieldDescription className="text-center">
                                Already have an account?{" "}
                                <Link href="/auth/login" className="text-primary hover:underline">
                                    Sign in
                                </Link>
                            </FieldDescription>
                        </FieldGroup>
                    </form>

                    {/* IMAGE SECTION */}
                    <div className="bg-muted relative hidden md:block">
                        <img
                            src="/ecoshift-wallpaper.jpg"
                            alt="Signup Background"
                            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                        />
                    </div>
                </CardContent>
            </Card>

            <FieldDescription className="px-6 text-center">
                By continuing, you agree to our <a href="#">Terms of Service</a> and{" "}
                <a href="#">Privacy Policy</a>.
            </FieldDescription>
        </div>
    );
}
