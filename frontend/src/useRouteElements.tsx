/* eslint-disable react-refresh/only-export-components */
import { Navigate, Outlet, useRoutes } from 'react-router-dom'
import MainLayout from './layouts'
import ChatAppPage from './pages/ChatAppPage'
import SignUpPage from './pages/SignUpPage'
import SignInPage from './pages/SignInPage'
import { useContext } from 'react'
import { AppContext } from './context/app.context'
import ProfilePage from './pages/ProfilePage'
import FriendPage from './pages/FriendPage'
import FriendInvitationPage from './pages/FriendInvitationPage'

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
        },
        {
          path: '/profile',
          index: true,
          element: (
            <MainLayout>
              <ProfilePage />
            </MainLayout>
          )
        },
        {
          path: '/phonebook/friend-list',
          index: true,
          element: [
            <MainLayout>
              <FriendPage />
            </MainLayout>
          ]
        },
        {
          path: '/phonebook/friend-invitation',
          index: true,
          element: [
            <MainLayout>
              <FriendInvitationPage />
            </MainLayout>
          ]
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
