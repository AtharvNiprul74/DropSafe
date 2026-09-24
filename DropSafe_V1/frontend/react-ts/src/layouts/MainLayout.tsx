import type { ReactNode } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

interface MainLayoutProps {
    children: ReactNode;
}

function MainLayout({children}: MainLayoutProps){
    return(
        <div className="app-shell">
            <Header />
             
             <div className="app-body">
                <Sidebar />

                <main className="main-content">
                    {children}
                </main>
             </div>
        </div>
    );
}

export default MainLayout;