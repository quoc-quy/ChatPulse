export const lightColors = {
  background: 'hsl(260, 30%, 98%)',
  foreground: 'hsl(260, 10%, 15%)',
  card: 'hsl(260, 30%, 100%)',
  cardForeground: 'hsl(260, 10%, 15%)',
  popover: 'hsl(260, 30%, 100%)',
  popoverForeground: 'hsl(260, 10%, 15%)',
  primary: 'hsl(262, 83%, 60%)', // Đã ép sang Tím
  primaryForeground: 'hsl(0, 0%, 100%)',
  secondary: 'hsl(270, 75%, 65%)',
  secondaryForeground: 'hsl(0, 0%, 100%)',
  muted: 'hsl(260, 15%, 90%)',
  mutedForeground: 'hsl(260, 10%, 40%)',
  accent: 'hsl(262, 80%, 95%)',
  accentForeground: 'hsl(262, 80%, 40%)',
  destructive: 'hsl(0, 84%, 60%)',
  destructiveForeground: 'hsl(0, 0%, 100%)',
  border: 'hsl(260, 15%, 85%)',
  input: 'hsl(260, 15%, 92%)',
  ring: 'hsl(262, 80%, 55%)',

  // 👇 Các màu bổ sung cho UI Mobile
  badge: 'hsl(0, 84%, 60%)',          
  textLight: 'hsl(260, 10%, 45%)',    
  surface: 'hsl(260, 30%, 100%)',  
  text: 'hsl(260, 10%, 15%)',    
  success: 'hsl(142, 76%, 36%)',   
  surfaceSoft: 'hsl(260, 15%, 95%)', 
  searchBg: 'hsl(260, 15%, 94%)',
  highlight: 'hsl(50, 100%, 70%)',
  headerText: '#FFFFFF',
  fileBg: 'hsl(260, 33%, 96%)',
}

export const darkColors = {
  background: 'hsl(240, 10%, 4%)', // Tối đen giống web
  foreground: 'hsl(260, 20%, 98%)',
  card: 'hsl(240, 10%, 6%)',
  cardForeground: 'hsl(260, 20%, 98%)',
  popover: 'hsl(240, 10%, 6%)',
  popoverForeground: 'hsl(260, 20%, 98%)',
  primary: 'hsl(262, 83%, 65%)', // Tím sáng
  primaryForeground: 'hsl(0, 0%, 100%)',
  secondary: 'hsl(260, 15%, 15%)',
  secondaryForeground: 'hsl(260, 20%, 98%)',
  muted: 'hsl(260, 15%, 15%)',
  mutedForeground: 'hsl(260, 10%, 65%)',
  accent: 'hsl(260, 15%, 15%)',
  accentForeground: 'hsl(260, 20%, 98%)',
  destructive: 'hsl(0, 62%, 40%)',
  destructiveForeground: 'hsl(0, 0%, 100%)',
  border: 'hsl(260, 15%, 15%)',
  input: 'hsl(260, 15%, 15%)',
  ring: 'hsl(262, 83%, 65%)',

  // 👇 Các màu bổ sung tương ứng cho Dark Mode Mobile
  badge: 'hsl(0, 62%, 50%)',
  textLight: 'hsl(260, 10%, 65%)',
  surface: 'hsl(240, 10%, 6%)',
  text: 'hsl(260, 20%, 98%)',
  success: 'hsl(142, 69%, 58%)',
  surfaceSoft: 'hsl(240, 20%, 14%)',
  searchBg: 'hsl(240, 20%, 15%)',
  highlight: 'hsl(50, 80%, 45%)',
  headerText: '#FFFFFF',
  fileBg: 'hsl(260, 33%, 17%)',
}

export type ThemeColors = typeof lightColors