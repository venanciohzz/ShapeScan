
/**
 * Utilitário para envolver importações dinâmicas (React.lazy).
 * Se o carregamento de um módulo falhar (comum em novos deployments onde o bundle antigo sumiu),
 * ele tenta recarregar a página uma única vez para pegar a versão mais recente do index.html e dos assets.
 */
export const lazyRetry = <T,>(componentImport: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Verifica se já tentamos recarregar para este componente específico nesta sessão
    const componentName = componentImport.toString();
    const hasRetried = window.sessionStorage.getItem(`retry-${componentName}`);

    componentImport()
      .then((component) => {
        // Se carregar com sucesso, limpa a flag de retry caso exista
        if (hasRetried) {
          window.sessionStorage.removeItem(`retry-${componentName}`);
        }
        resolve(component);
      })
      .catch((error) => {
        if (!hasRetried) {
          // Primeira falha: marca que tentamos e recarrega
          window.sessionStorage.setItem(`retry-${componentName}`, 'true');
          console.warn('Falha ao carregar módulo dinâmico. Atualizando a página para obter a versão mais recente...', error);
          window.location.reload();
        } else {
          // Se falhar mesmo após o reload, rejeita o erro para o ErrorBoundary (se existir) ou Suspense
          console.error('Falha persistente ao carregar o módulo após recarregamento da página.', error);
          reject(error);
        }
      });
  });
};
