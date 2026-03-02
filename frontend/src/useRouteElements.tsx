/* eslint-disable react-refresh/only-export-components */
import { Navigate, Outlet, useRoutes } from 'react-router-dom'
import MainLayout from './layouts'
import ChatAppPage from './pages/ChatAppPage'
import SignUpPage from './pages/SignUpPage'
import SignInPage from './pages/SignInPage'
import { useContext } from 'react'
import { AppContext } from './context/app.context'

function ProtectedRoute() {
  const { isAuthenticated } = useContext(AppContext)
  return isAuthenticated ? <Outlet /> : <Navigate to={'/signin'} />
}

function RejectedRoute() {
  const { isAuthenticated } = useContext(AppContext)
  return !isAuthenticated ? <Outlet /> : <Navigate to={'/'} />
}

export default function useRouteElements() {
  const routeElements = useRoutes([
    // private routes
    {
      path: '',
      element: <ProtectedRoute />,
      children: [
        {
          path: '/',
          index: true,
          element: (
            <MainLayout>
              <ChatAppPage />
            </MainLayout>
          )
        }
      ]
    },

    // public routes
    {
      path: '',
      element: <RejectedRoute />,
      children: [
        {
          path: '/signup',
          index: true,
          element: <SignUpPage />
        },
        {
          path: '/signin',
          index: true,
          element: <SignInPage />
        }
      ]
    }
  ])
  return routeElements
}
