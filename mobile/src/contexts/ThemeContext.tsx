import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors, ThemeColors } from "../theme/colors";

// Tạo Context
type ThemeContextType = {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true,
  setIsDarkMode: () => {},
  colors: darkColors, // mặc định dark
});

// Provider để bọc ngoài cùng App
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkModeState] = useState(true);

  // Lúc mở app lên, đọc xem trước đó user chọn nền gì
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem("theme_mode");
      if (savedTheme !== null) {
        setIsDarkModeState(savedTheme === "dark");
      }
    };
    loadTheme();
  }, []);

  // Hàm đổi theme và lưu lại
  const setIsDarkMode = async (value: boolean) => {
    setIsDarkModeState(value);
    await AsyncStorage.setItem("theme_mode", value ? "dark" : "light");
  };

  const colors: ThemeColors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook để xài ở các màn hình khác
export const useTheme = () => useContext(ThemeContext);
