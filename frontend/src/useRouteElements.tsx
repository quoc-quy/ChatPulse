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
import BlockUserPage from './pages/BlockUserPage'
import FriendRequest from './pages/FriendRequest'
import ChangePassword from './pages/ChangePassword'
import VerifyForgotPasswordToken from './pages/VerifyForgotPasswordToken'
import ResetPassword from './pages/ResetPassword'
import { ForgotPasswordForm } from './pages/ForgotPasswordForm'

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
        },
        {
          path: '/phonebook/friend-request',
          index: true,
          element: [
            <MainLayout>
              <FriendRequest />
            </MainLayout>
          ]
        },
        {
          path: '/phonebook/blocking',
          index: true,
          element: [
            <MainLayout>
              <BlockUserPage />
            </MainLayout>
          ]
        },
        {
          path: '/settings/change-password',
          index: true,
          element: [
            <MainLayout>
              <ChangePassword />
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
    },

    {
      path: '/forgot-password-form',
      element: <ForgotPasswordForm />
    },
    {
      path: '/forgot-password',
      element: <VerifyForgotPasswordToken />
    },
    {
      path: '/reset-password',
      element: <ResetPassword />
    }
  ])
  return routeElements
}
