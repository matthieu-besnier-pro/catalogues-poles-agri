import { useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    {/* Code d'erreur 404 */}
                    <div className="space-y-2">
                        <h1 className="text-7xl font-display font-light text-muted-foreground/40">404</h1>
                        <div className="h-0.5 w-16 bg-border mx-auto"></div>
                    </div>

                    {/* Message principal */}
                    <div className="space-y-3">
                        <h2 className="font-display text-2xl text-foreground">
                            Page introuvable
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                            La page <span className="font-medium text-foreground">« {pageName} »</span> n'existe pas dans cette application.
                        </p>
                    </div>

                    {/* Note pour les administrateurs */}
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-8 p-4 bg-secondary/60 rounded-lg border border-border">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-sm font-medium text-foreground">Note admin</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Cette page n'a peut-être pas encore été créée. Demandez-le dans la conversation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bouton d'action */}
                    <div className="pt-6">
                        <button
                            onClick={() => window.location.href = '/'}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-full hover:bg-secondary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            <Home className="w-4 h-4 mr-2" aria-hidden="true" />
                            Retour à l'accueil
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
