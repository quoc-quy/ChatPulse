import { useRoutes } from "react-router-dom";
import MainLayout from "./layouts";
import HomeScreen from "./screens/HomeScreen";

export default function useRouteElements() {
  const routeElements = useRoutes([
    {
      path: "/",
      index: true,
      element: (
        <MainLayout>
          <HomeScreen />
        </MainLayout>
      ),
    },
  ]);
  return routeElements;
}
