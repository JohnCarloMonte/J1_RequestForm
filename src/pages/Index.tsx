import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Company Request Form System</h1>
        <p className="text-muted-foreground mb-6">Open the form for your role</p>

        <div className="flex gap-6 justify-center">
          <Link to="/requester" className="group flex flex-col items-center gap-3 px-8 py-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-lg transition-all duration-200">
            <span className="text-lg font-semibold text-foreground">Requestor</span>
            <span className="text-sm text-muted-foreground">Submit new requests</span>
          </Link>

          <Link to="/supplier" className="group flex flex-col items-center gap-3 px-8 py-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-lg transition-all duration-200">
            <span className="text-lg font-semibold text-foreground">Supplier</span>
            <span className="text-sm text-muted-foreground">View & manage requests</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
