'use client';

/**
 * SPV Connection Widget
 * OAuth2 connection flow and status display for ANAF Spațiul Privat Virtual
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Shield,
  Info,
} from 'lucide-react';
import { spvService } from '@/lib/anaf/services';
import { mockSpvConnectionStatus, mockSpvConnectionDisconnected } from '@/lib/anaf/mocks';
import type { SpvConnectionStatus } from '@/lib/anaf/types';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ANAF === 'true';

export function SpvConnectionWidget() {
  const [status, setStatus] = useState<SpvConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      if (USE_MOCK) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setStatus(mockSpvConnectionStatus);
      } else {
        const data = await spvService.getConnectionStatus();
        setStatus(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch SPV status:', err);
      setError(err.message || 'Eroare la verificarea conexiunii SPV');
      if (USE_MOCK) {
        setStatus(mockSpvConnectionDisconnected);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      if (USE_MOCK) {
        // Simulate OAuth redirect
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Mock OAuth: În producție, veți fi redirecționat către ANAF pentru autentificare.');
        setStatus(mockSpvConnectionStatus);
      } else {
        const { authUrl } = await spvService.getOAuthUrl();
        // Redirect to ANAF OAuth page
        window.location.href = authUrl;
      }
    } catch (err: any) {
      console.error('Failed to initiate OAuth:', err);
      setError(err.message || 'Eroare la inițializarea conexiunii SPV');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Sigur doriți să deconectați SPV? Nu veți mai putea transmite declarații până la reconectare.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setStatus(mockSpvConnectionDisconnected);
      } else {
        await spvService.disconnect();
        await fetchStatus();
      }
    } catch (err: any) {
      console.error('Failed to disconnect:', err);
      setError(err.message || 'Eroare la deconectarea SPV');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Conexiune SPV ANAF
          </CardTitle>
          <CardDescription>Verificare status conexiune...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected ?? false;
  const tokenExpiry = status?.tokenExpiresAt ? new Date(status.tokenExpiresAt) : null;
  const daysUntilExpiry = tokenExpiry
    ? Math.ceil((tokenExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Conexiune SPV ANAF
          </span>
          <Badge
            variant={isConnected ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Conectat
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Deconectat
              </>
            )}
          </Badge>
        </CardTitle>
        <CardDescription>
          Spațiul Privat Virtual pentru transmiterea declarațiilor ANAF
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConnected && status ? (
          <>
            {/* Connection Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CUI:</span>
                <span className="font-medium">{status.cui}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Companie:</span>
                <span className="font-medium">{status.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conectat din:</span>
                <span className="font-medium">
                  {status.connectedAt
                    ? new Date(status.connectedAt).toLocaleDateString('ro-RO')
                    : '-'
                  }
                </span>
              </div>
              {tokenExpiry && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token valid până:</span>
                  <span className={`font-medium ${daysUntilExpiry < 30 ? 'text-orange-600' : ''}`}>
                    {tokenExpiry.toLocaleDateString('ro-RO')}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({daysUntilExpiry} zile)
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Features Status */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Funcționalități active:</h4>
              <div className="grid grid-cols-3 gap-2">
                <Badge variant={status.features?.efactura ? 'default' : 'secondary'} className="justify-center">
                  e-Factura
                </Badge>
                <Badge variant={status.features?.saft ? 'default' : 'secondary'} className="justify-center">
                  SAF-T
                </Badge>
                <Badge variant={status.features?.eTransport ? 'default' : 'secondary'} className="justify-center">
                  e-Transport
                </Badge>
              </div>
            </div>

            {/* Token Expiry Warning */}
            {daysUntilExpiry > 0 && daysUntilExpiry < 30 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Token-ul SPV expiră în {daysUntilExpiry} zile.
                  Reconectați-vă pentru a reînnoi autentificarea.
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                disabled={loading}
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Reîmprospătare
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
                className="flex-1"
              >
                Deconectare
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Pentru a transmite declarații către ANAF (SAF-T D406, e-Factura, e-Transport),
                trebuie să vă conectați la Spațiul Privat Virtual.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Conectarea la SPV vă permite:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Transmiterea SAF-T D406 lunar</li>
                <li>Emiterea e-Facturilor B2B și B2C</li>
                <li>Generarea declarațiilor e-Transport</li>
                <li>Descărcarea facturilor primite</li>
                <li>Verificarea statusului declarațiilor</li>
              </ul>
            </div>

            {/* Connect Button */}
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conectare în curs...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Conectare SPV ANAF
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Veți fi redirecționat către platforma ANAF pentru autentificare
            </p>
          </>
        )}

        {/* Help Link */}
        <div className="pt-2 border-t">
          <a
            href="https://www.anaf.ro/SpatiulPrivatVirtual/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Mai multe despre SPV ANAF
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
