import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      let newCart = [...cart];

      if (!stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productInCart) {
        if ((productInCart.amount + 1) > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        newCart = cart.map(cartProduct => {
          if (cartProduct.id === productId) {
            return {
              ...cartProduct,
              amount: cartProduct.amount + 1
            }
          }
          
          return cartProduct;
        });
      } else {
        if (!stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const { data: product } = await api.get('/products/' + productId);
        newCart.push({ ...product, amount: 1});
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const itemToRemoveIndex = cart.findIndex(product => product.id === productId);

      if (itemToRemoveIndex === -1) {
        throw new Error();
      }

      let newCart = cart.filter(product => product.id !== productId);

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      const { data: stock } = await api.get<Stock>('/stock/' + productId);
      let newCart: Product[] = [...cart];

      if (productInCart && amount) {
        if (amount > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        newCart = cart.map(cartProduct => {
          if (cartProduct.id === productId) {
            return {
              ...cartProduct,
              amount
            }
          }
          
          return cartProduct;
        });
        
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
