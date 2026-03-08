import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { DeviceLimitDialog } from "@/components/auth/DeviceLimitDialog";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, deviceLimitReached, activeSessions, maxDevices, terminateSessionAndContinue, cancelDeviceLimit } = useSupabaseAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showSignUpOption, setShowSignUpOption] = useState(false);

  useEffect(() => {
    supabase.rpc("check_admins_exist").then(({ data }) => {
      setShowSignUpOption(data === false);
    });
  }, []);

  // Get the landing page for a given role from application_settings
  const getLandingPage = async (userId: string): Promise<string> => {
    try {
      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const userRole = roleData?.role || "biller";

      // Get landing page setting
      const { data: settingData } = await supabase
        .from("application_settings")
        .select("setting_value")
        .eq("setting_key", "default_landing_pages")
        .maybeSingle();

      if (settingData?.setting_value) {
        const pages = settingData.setting_value as Record<string, string>;
        return pages[userRole] || "/";
      }
      return "/";
    } catch {
      return "/";
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Error", description: "Please enter your email address", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Email sent!", description: "Check your inbox for the password reset link." });
      setIsForgotPassword(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send reset email", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              name: name || email.split("@")[0],
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "You are now signed in as admin.",
        });
        navigate("/");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });

        // Get role-based landing page
        const landingPage = await getLandingPage(data.user.id);
        navigate(landingPage);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Shamshad Footwear" className="w-24 h-24 object-contain mb-2" />
            <span className="text-xl font-bold text-foreground">Shamshad Footwear</span>
            <span className="text-xs tracking-[0.25em] text-muted-foreground uppercase">Wholesale Supplier</span>
          </div>

          <h1 className="text-xl font-semibold text-center text-foreground mb-2">
            {isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isForgotPassword
              ? "Enter your email to receive a reset link"
              : isSignUp
              ? "Create your admin account"
              : "Sign in to continue"}
          </p>

          <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {!isSignUp && !isForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isForgotPassword ? "Send Reset Link" : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-sm text-primary hover:underline"
              >
                Back to Sign In
              </button>
            ) : (
              <>
                {showSignUpOption && (
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-primary hover:underline block mx-auto"
                  >
                    {isSignUp ? "Already have an account? Sign In" : "First time? Create Admin Account"}
                  </button>
                )}
                <a
                  href="/portal"
                  className="text-sm text-primary hover:underline block"
                >
                  Client Portal — Check your data with PIN
                </a>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Wholesale Footwear Billing & Inventory Management
        </p>

        <DeviceLimitDialog
          open={deviceLimitReached}
          sessions={activeSessions}
          maxDevices={maxDevices}
          onTerminateAndContinue={async (sessionId) => {
            await terminateSessionAndContinue(sessionId);
            const landingPage = await getLandingPage(email);
            navigate(landingPage);
          }}
          onCancel={cancelDeviceLimit}
        />
      </motion.div>
    </div>
  );
};

export default Login;
