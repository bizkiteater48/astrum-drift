import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  useGetMe, 
  getGetMeQueryKey,
  useLogin, 
  useRegister,
  ApiError
} from "@workspace/api-client-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, TerminalSquare } from "lucide-react";

import { extractErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const authSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(32, "Username is too long"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128, "Password is too long"),
});

type AuthValues = z.infer<typeof authSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { data: player, isLoading: meLoading } = useGetMe({ 
    query: { 
      queryKey: getGetMeQueryKey(),
      retry: false,
    } 
  });
  
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const { toast } = useToast();

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      setLocation("/play");
    }
  }, [player, setLocation]);

  const loginForm = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { username: "", password: "" },
  });

  const onLogin = async (data: AuthValues) => {
    setAuthError(null);
    try {
      await loginMutation.mutateAsync({ data });
      setLocation("/play");
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 403) {
        setAuthError(extractErrorMessage(error) ?? "This network is already in use by another commander.");
      } else {
        setAuthError(extractErrorMessage(error) ?? "Failed to authenticate connection");
      }
    }
  };

  const onRegister = async (data: AuthValues) => {
    setAuthError(null);
    try {
      await registerMutation.mutateAsync({ data });
      setLocation("/play");
    } catch (error: unknown) {
      setAuthError(extractErrorMessage(error) ?? "Failed to initialize new commander profile");
    }
  };

  if (meLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center">
        <div className="absolute inset-0 crt-overlay" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-primary mt-4 font-mono uppercase tracking-widest animate-pulse">Establishing Connection...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 crt-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      
      <div className="w-full max-w-md z-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-4 rounded-full border border-primary/30 bg-primary/5 mb-4 box-glow">
            <TerminalSquare className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold uppercase tracking-[0.2em] text-primary text-glow font-mono">Astrum Drift</h1>
          <p className="text-muted-foreground font-mono text-sm tracking-wider uppercase">Deep Space Mining Protocol v0.1</p>
        </div>

        <Tabs defaultValue="login" className="w-full" onValueChange={() => setAuthError(null)}>
          <TabsList className="grid w-full grid-cols-2 bg-card border border-primary/20 rounded-none h-12">
            <TabsTrigger value="login" className="rounded-none font-mono uppercase tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Initialize</TabsTrigger>
            <TabsTrigger value="register" className="rounded-none font-mono uppercase tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-4">
            <Card className="border-primary/20 bg-card/80 backdrop-blur-sm rounded-none box-glow">
              <CardHeader>
                <CardTitle className="font-mono uppercase tracking-widest text-primary text-lg">Commander Login</CardTitle>
                <CardDescription className="font-mono text-xs">Enter your credentials to access the ship terminal.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-primary/80">Designation</FormLabel>
                          <FormControl>
                            <Input placeholder="CMDR-XYZ" {...field} className="font-mono rounded-none border-primary/30 focus-visible:ring-primary/50 bg-background/50 text-foreground" />
                          </FormControl>
                          <FormMessage className="font-mono text-xs text-destructive text-glow" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-primary/80">Access Code</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="font-mono rounded-none border-primary/30 focus-visible:ring-primary/50 bg-background/50 text-foreground" />
                          </FormControl>
                          <FormMessage className="font-mono text-xs text-destructive text-glow" />
                        </FormItem>
                      )}
                    />
                    
                    {authError && (
                      <div className="bg-destructive/10 border border-destructive/30 p-3 mt-4">
                        <p className="text-destructive text-xs font-mono uppercase font-bold text-glow">{authError}</p>
                      </div>
                    )}
                    
                    <Button type="submit" className="w-full rounded-none font-mono uppercase tracking-widest" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Connect"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="register" className="mt-4">
            <Card className="border-primary/20 bg-card/80 backdrop-blur-sm rounded-none box-glow">
              <CardHeader>
                <CardTitle className="font-mono uppercase tracking-widest text-primary text-lg">New Commander</CardTitle>
                <CardDescription className="font-mono text-xs">Register a new profile in the company database.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-primary/80">Designation</FormLabel>
                          <FormControl>
                            <Input placeholder="CMDR-XYZ" {...field} className="font-mono rounded-none border-primary/30 focus-visible:ring-primary/50 bg-background/50 text-foreground" />
                          </FormControl>
                          <FormMessage className="font-mono text-xs text-destructive text-glow" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono uppercase text-primary/80">Access Code</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="font-mono rounded-none border-primary/30 focus-visible:ring-primary/50 bg-background/50 text-foreground" />
                          </FormControl>
                          <FormMessage className="font-mono text-xs text-destructive text-glow" />
                        </FormItem>
                      )}
                    />
                    
                    {authError && (
                      <div className="bg-destructive/10 border border-destructive/30 p-3 mt-4">
                        <p className="text-destructive text-xs font-mono uppercase font-bold text-glow">{authError}</p>
                      </div>
                    )}
                    
                    <Button type="submit" className="w-full rounded-none font-mono uppercase tracking-widest" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
