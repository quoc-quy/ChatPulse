import { useRoutes } from 'react-router-dom'
import MainLayout from './layouts'
import ChatAppPage from './pages/ChatAppPage'
import SignUpPage from './pages/SignUpPage'
import SignInPage from './pages/SignInPage'

export default function useRouteElements() {
  const routeElements = useRoutes([
    // private routes
    {
      path: '/',
      index: true,
      element: (
        <MainLayout>
          <ChatAppPage />
        </MainLayout>
      )
    },

    // public routes
    {
      path: '/signup',
      index: true,
      element: (
        <MainLayout>
          <SignUpPage />
        </MainLayout>
      )
    },
    {
      path: '/signin',
      index: true,
      element: (
        <MainLayout>
          <SignInPage />
        </MainLayout>
      )
    }
  ])
  return routeElements
}
