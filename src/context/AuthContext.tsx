import { createContext, useContext, useState, ReactNode } from "react";
import { User, UserRole, ROLE_PERMISSIONS, RolePermissions } from "@/types";

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  createUser: (user: Omit<User, "id" | "createdAt">) => boolean;
  updateUser: (id: string, updates: Partial<User>) => boolean;
  deleteUser: (id: string) => boolean;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  getPermissions: () => RolePermissions | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const initialUsers: User[] = [
  {
    id: "1",
    email: "admin@billflow.pk",
    name: "Admin User",
    role: "admin",
    phone: "+92 300 1234567",
    createdAt: new Date("2025-01-01"),
    isActive: true,
  },
  {
    id: "2",
    email: "biller@billflow.pk",
    name: "Biller User",
    role: "biller",
    phone: "+92 321 7654321",
    createdAt: new Date("2025-01-15"),
    isActive: true,
  },
  {
    id: "3",
    email: "cashier@billflow.pk",
    name: "Cashier User",
    role: "cashier",
    phone: "+92 333 9876543",
    createdAt: new Date("2025-02-01"),
    isActive: true,
  },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(initialUsers[0]); // Default to admin for now
  const [users, setUsers] = useState<User[]>(initialUsers);

  const login = (email: string, password: string): boolean => {
    const user = users.find((u) => u.email === email && u.isActive);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const createUser = (userData: Omit<User, "id" | "createdAt">): boolean => {
    if (!currentUser || currentUser.role !== "admin") return false;
    
    const existingUser = users.find((u) => u.email === userData.email);
    if (existingUser) return false;

    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setUsers([...users, newUser]);
    return true;
  };

  const updateUser = (id: string, updates: Partial<User>): boolean => {
    if (!currentUser || currentUser.role !== "admin") return false;
    
    setUsers(users.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    return true;
  };

  const deleteUser = (id: string): boolean => {
    if (!currentUser || currentUser.role !== "admin") return false;
    if (id === currentUser.id) return false; // Can't delete self
    
    setUsers(users.filter((u) => u.id !== id));
    return true;
  };

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    if (!currentUser) return false;
    return ROLE_PERMISSIONS[currentUser.role][permission];
  };

  const getPermissions = (): RolePermissions | null => {
    if (!currentUser) return null;
    return ROLE_PERMISSIONS[currentUser.role];
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        logout,
        createUser,
        updateUser,
        deleteUser,
        hasPermission,
        getPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
