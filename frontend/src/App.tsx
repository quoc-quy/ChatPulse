import { ThemeProvider } from './components/theme-provider'
import useRouteElements from './useRouteElements'

function App() {
  const routeElements = useRouteElements()
  return (
    <ThemeProvider defaultTheme='system' storageKey='chatpulse-theme'>
      {routeElements}
    </ThemeProvider>
  )
}

export default App
