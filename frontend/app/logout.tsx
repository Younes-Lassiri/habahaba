import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

const useLogout = () => {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/signin");
  };

  return handleLogout;
};

export default useLogout;