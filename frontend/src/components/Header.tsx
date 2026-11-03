
interface HeaderProps {
  searchTerm: string
  onSearchChange: (value: string) => void
}

function Header({ searchTerm, onSearchChange }: HeaderProps) {

  return (
    <header className="header">

      <div className="header-content">

        <div className="header-logo">
          <span className="logo-icon">▶</span>
          <span>VideoStream</span>
        </div>

        <div className="header-search">

          <span className="search-icon">⌕</span>

          <input
            type="search"
            placeholder="Medien durchsuchen..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />

        </div>

      </div>

    </header>
  )
}

export default Header
