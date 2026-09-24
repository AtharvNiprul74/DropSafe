const NavigationItems=[
    "Dashboards",
    "Students",
    "Predictions",
    "Intervations"
];


function Sidebar(){
    return(
        <aside className="sidebar">
            <nav aria-label="Main navigation">
                <ul className="sidebar__nav">
                    {NavigationItems.map((item) => (
                        <li key={item}>
                            <a 
                              href={`#${item.toLowerCase()}`}
                              className={
                                item === "Dashboard"
                                 ? "sidebar__link sidebar__link--active"
                                 : "sidebar__link"
                              }
                            >
                              {item}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}

export default Sidebar;