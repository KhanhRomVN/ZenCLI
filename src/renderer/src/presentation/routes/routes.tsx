import { RouteObject } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import ChatPage from '../pages/Chat'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: <ChatPage />
      }
    ]
  }
]
